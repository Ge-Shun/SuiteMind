import { afterEach, describe, expect, it, vi } from "vitest";

import { SuiteMindApiError, transformText } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("transformText", () => {
  it("delivers streamed deltas", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'event: delta\ndata: {"type":"delta","text":"Hello"}\n\n' +
              'event: done\ndata: {"type":"done","requestId":"1"}\n\n',
          ),
        );
        controller.close();
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(stream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      ),
    );
    const deltas: string[] = [];

    await transformText(
      { operation: "polish", text: "Draft", instruction: "" },
      {
        signal: new AbortController().signal,
        onDelta: (text) => deltas.push(text),
      },
    );

    expect(deltas).toEqual(["Hello"]);
  });

  it("raises streamed API errors", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'event: error\ndata: {"type":"error","code":"PROVIDER_ERROR","message":"Failed","retryable":true}\n\n',
          ),
        );
        controller.close();
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(stream, { status: 200 })),
    );

    await expect(
      transformText(
        { operation: "polish", text: "Draft", instruction: "" },
        {
          signal: new AbortController().signal,
          onDelta: () => undefined,
        },
      ),
    ).rejects.toBeInstanceOf(SuiteMindApiError);
  });

  it("rejects a stream that closes without a done event", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'event: delta\ndata: {"type":"delta","text":"Partial"}\n\n',
          ),
        );
        controller.close();
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(stream, { status: 200 })),
    );

    await expect(
      transformText(
        { operation: "polish", text: "Draft", instruction: "" },
        {
          signal: new AbortController().signal,
          onDelta: () => undefined,
        },
      ),
    ).rejects.toMatchObject({ code: "INCOMPLETE_STREAM" });
  });

  it("marks rate-limit responses as retryable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            code: "RATE_LIMITED",
            message: "Try again shortly.",
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    await expect(
      transformText(
        { operation: "polish", text: "Draft", instruction: "" },
        {
          signal: new AbortController().signal,
          onDelta: () => undefined,
        },
      ),
    ).rejects.toMatchObject({
      code: "RATE_LIMITED",
      retryable: true,
    });
  });

  it("calls OpenAI-compatible providers directly when configured", async () => {
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

  it("uses the DeepSeek OpenAI-compatible chat completions endpoint", async () => {
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
    const deltas: string[] = [];

    await transformText(
      { operation: "polish", text: "Draft", instruction: "" },
      {
        signal: new AbortController().signal,
        onDelta: (text) => deltas.push(text),
      },
      {
        providerSettings: {
          mode: "deepseek",
          baseUrl: "https://api.deepseek.com",
          apiKey: "deepseek-key",
          model: "deepseek-v4-flash",
        },
      },
    );

    expect(deltas).toEqual(["Deep"]);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.deepseek.com/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer deepseek-key" }),
      }),
    );
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
      { operation: "polish", text: "Draft", instruction: "" },
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
          "anthropic-version": "2023-06-01",
          "x-api-key": "claude-key",
        }),
      }),
    );
  });

  it("streams Gemini generate content chunks", async () => {
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
      { operation: "polish", text: "Draft", instruction: "" },
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
    const call = fetch.mock.calls[0];
    expect(call).toBeDefined();
    const [url, init] = call as Parameters<typeof fetch>;
    expect(url.toString()).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=gemini-key",
    );
    expect(init).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "text/event-stream" }),
      }),
    );
  });

  it("requires complete OpenAI-compatible provider settings", async () => {
    await expect(
      transformText(
        { operation: "polish", text: "Draft", instruction: "" },
        {
          signal: new AbortController().signal,
          onDelta: () => undefined,
        },
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
