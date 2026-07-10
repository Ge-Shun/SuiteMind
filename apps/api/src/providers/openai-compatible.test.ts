import { afterEach, describe, expect, it, vi } from "vitest";

import { OpenAiCompatibleProvider } from "./openai-compatible";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OpenAiCompatibleProvider", () => {
  it("parses content split across arbitrary network chunks", async () => {
    const payload =
      'data: {"choices":[{"delta":{"content":"Hello "}}]}\n\n' +
      'data: {"choices":[{"delta":{"content":"world"}}]}\n\n' +
      "data: [DONE]";
    const bytes = new TextEncoder().encode(payload);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(bytes.slice(0, 17));
        controller.enqueue(bytes.slice(17, 61));
        controller.enqueue(bytes.slice(61));
        controller.close();
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(stream, { status: 200 })),
    );
    const provider = new OpenAiCompatibleProvider({
      baseUrl: "https://provider.example/v1",
      apiKey: "secret",
      model: "model-id",
    });
    const chunks: string[] = [];

    await provider.transform(
      { operation: "polish", text: "Draft", instruction: "" },
      {
        signal: new AbortController().signal,
        onDelta: (text) => chunks.push(text),
      },
    );

    expect(chunks.join("")).toBe("Hello world");
  });

  it("does not expose the provider response body on HTTP errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("sensitive upstream detail", { status: 401 })),
    );
    const provider = new OpenAiCompatibleProvider({
      baseUrl: "https://provider.example/v1",
      apiKey: "secret",
      model: "model-id",
    });

    await expect(
      provider.transform(
        { operation: "polish", text: "Draft", instruction: "" },
        {
          signal: new AbortController().signal,
          onDelta: () => undefined,
        },
      ),
    ).rejects.toThrow("status 401");
  });
});
