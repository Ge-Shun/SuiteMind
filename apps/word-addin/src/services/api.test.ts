import { afterEach, describe, expect, it, vi } from "vitest";

import { buildPrompt, transformText } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("direct provider transforms", () => {
  it("builds a question-answering prompt without rewrite instructions", () => {
    const messages = buildPrompt({
      operation: "ask",
      text: "Revenue increased by 20%.",
      instruction: "What changed?",
    });

    expect(messages[0].content).toContain("Answer the user's question");
    expect(messages[0].content).toContain("Return only the answer");
    expect(messages[1].content).toContain("Question:\nWhat changed?");
    expect(messages[1].content).toContain("Document text:\nRevenue increased");
  });

  it("calls OpenAI-compatible providers directly", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"content":"Hi"},"finish_reason":null}]}\n\n' +
              "data: [DONE]\n\n",
          ),
        );
        controller.close();
      },
    });
    const fetch = vi.fn().mockResolvedValue(new Response(stream, { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("crypto", { randomUUID: () => "request-id" });
    const deltas: string[] = [];

    await transformText(
      { operation: "polish", text: "Draft", instruction: "" },
      {
        signal: new AbortController().signal,
        onDelta: (text) => deltas.push(text),
      },
      {
        providerSettings: {
          mode: "openai-compatible",
          baseUrl: "https://example.test/v1/",
          apiKey: "user-key",
          model: "custom-model",
        },
      },
    );

    expect(deltas).toEqual(["Hi"]);
    expect(fetch).toHaveBeenCalledWith(
      "https://example.test/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer user-key" }),
      }),
    );
  });

  it("uses the DeepSeek OpenAI-compatible endpoint", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"content":"Deep"},"finish_reason":"stop"}]}\n\n',
          ),
        );
        controller.close();
      },
    });
    const fetch = vi.fn().mockResolvedValue(new Response(stream, { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("crypto", { randomUUID: () => "request-id" });

    await transformText(
      { operation: "rewrite", text: "Draft", instruction: "Make it concise" },
      { signal: new AbortController().signal, onDelta: () => undefined },
      {
        providerSettings: {
          mode: "deepseek",
          baseUrl: "https://api.deepseek.com",
          apiKey: "deepseek-key",
          model: "deepseek-chat",
        },
      },
    );

    expect(fetch).toHaveBeenCalledWith(
      "https://api.deepseek.com/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer deepseek-key" }),
      }),
    );
  });

  it("falls back to the local proxy when direct browser access fails", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"choices":[{"delta":{"content":"Proxy"},"finish_reason":"stop"}]}\n\n',
          ),
        );
        controller.close();
      },
    });
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(new Response(stream, { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("crypto", { randomUUID: () => "request-id" });
    const deltas: string[] = [];

    await transformText(
      { operation: "polish", text: "Draft", instruction: "" },
      {
        signal: new AbortController().signal,
        onDelta: (text) => deltas.push(text),
      },
      {
        providerSettings: {
          mode: "openai-compatible",
          baseUrl: "https://provider.example/v1",
          apiKey: "user-key",
          model: "custom-model",
        },
      },
    );

    expect(deltas).toEqual(["Proxy"]);
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://localhost:3001/api/provider/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer user-key",
          "X-SuiteMind-Target-Url": "https://provider.example/v1/chat/completions",
        }),
      }),
    );
  });

  it("reports when direct access and the local proxy are both unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(
      transformText(
        { operation: "polish", text: "Draft", instruction: "" },
        { signal: new AbortController().signal, onDelta: () => undefined },
        {
          providerSettings: {
            mode: "openai-compatible",
            baseUrl: "https://provider.example/v1",
            apiKey: "user-key",
            model: "custom-model",
          },
        },
      ),
    ).rejects.toMatchObject({ code: "LOCAL_PROXY_UNAVAILABLE" });
  });

  it("streams Claude content block deltas", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"text":"Claude"}}\n\n' +
              'event: message_stop\ndata: {"type":"message_stop"}\n\n',
          ),
        );
        controller.close();
      },
    });
    const fetch = vi.fn().mockResolvedValue(new Response(stream, { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("crypto", { randomUUID: () => "request-id" });
    const deltas: string[] = [];

    await transformText(
      { operation: "ask", text: "Draft", instruction: "Explain this" },
      {
        signal: new AbortController().signal,
        onDelta: (text) => deltas.push(text),
      },
      {
        providerSettings: {
          mode: "claude",
          baseUrl: "https://api.anthropic.com",
          apiKey: "claude-key",
          model: "claude-sonnet-4-5",
        },
      },
    );

    expect(deltas).toEqual(["Claude"]);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        headers: expect.objectContaining({
          "anthropic-dangerous-direct-browser-access": "true",
          "x-api-key": "claude-key",
        }),
      }),
    );
  });

  it("streams Gemini content chunks", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"candidates":[{"content":{"parts":[{"text":"Gemini"}]},"finishReason":"STOP"}]}\n\n',
          ),
        );
        controller.close();
      },
    });
    const fetch = vi.fn().mockResolvedValue(new Response(stream, { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("crypto", { randomUUID: () => "request-id" });
    const deltas: string[] = [];

    await transformText(
      { operation: "summarize", text: "Draft", instruction: "" },
      {
        signal: new AbortController().signal,
        onDelta: (text) => deltas.push(text),
      },
      {
        providerSettings: {
          mode: "gemini",
          baseUrl: "https://generativelanguage.googleapis.com/v1beta",
          apiKey: "gemini-key",
          model: "gemini-2.5-flash",
        },
      },
    );

    expect(deltas).toEqual(["Gemini"]);
    const [url] = fetch.mock.calls[0] as Parameters<typeof fetch>;
    expect(url.toString()).toContain("models/gemini-2.5-flash:streamGenerateContent");
    expect(url.toString()).toContain("key=gemini-key");
  });

  it("requires complete provider settings", async () => {
    await expect(
      transformText(
        { operation: "polish", text: "Draft", instruction: "" },
        { signal: new AbortController().signal, onDelta: () => undefined },
        {
          providerSettings: {
            mode: "openai-compatible",
            baseUrl: "https://example.test/v1",
            apiKey: "",
            model: "custom-model",
          },
        },
      ),
    ).rejects.toMatchObject({ code: "PROVIDER_SETTINGS_REQUIRED" });
  });
});
