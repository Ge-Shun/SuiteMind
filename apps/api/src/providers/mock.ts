import type { TransformRequest } from "@suitemind/contracts";

import type { ProviderContext, ProviderResult, TransformProvider } from "./types";

function mockTransform(request: TransformRequest): string {
  const normalized = request.text.replace(/[ \t]+/g, " ").trim();

  switch (request.operation) {
    case "polish":
      return normalized.replace(/\s+([,.;!?])/g, "$1");
    case "rewrite":
      return `${normalized}\n\n[Mock rewrite: configure an AI provider for generated wording.]`;
    case "translate":
      return `[Mock translation to ${request.targetLanguage}]\n${normalized}`;
    case "summarize":
      return normalized.length <= 180
        ? normalized
        : `${normalized.slice(0, 177).trimEnd()}...`;
    case "continue":
      return `${normalized}\n\n[Mock continuation: configure an AI provider to continue this text.]`;
    case "custom":
      return `${normalized}\n\n[Mock instruction: ${request.instruction}]`;
  }
}

export class MockProvider implements TransformProvider {
  readonly id = "mock";
  readonly model = "suitemind-mock";

  async transform(
    request: TransformRequest,
    context: ProviderContext,
  ): Promise<ProviderResult> {
    const output = mockTransform(request);
    const chunks = output.match(/.{1,24}/gs) ?? [];

    for (const chunk of chunks) {
      if (context.signal.aborted) {
        throw context.signal.reason ?? new DOMException("Aborted", "AbortError");
      }

      context.onDelta(chunk);
      await new Promise<void>((resolve) => setTimeout(resolve, 8));
    }

    return {};
  }
}
