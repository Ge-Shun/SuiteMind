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
});
