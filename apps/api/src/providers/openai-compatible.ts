import type { TransformRequest, TransformUsage } from "@suitemind/contracts";

import { buildPrompt } from "../prompts";
import type { ProviderContext, ProviderResult, TransformProvider } from "./types";

interface OpenAiCompatibleProviderOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
}

interface ChatChunk {
  choices?: Array<{
    delta?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

export class OpenAiCompatibleProvider implements TransformProvider {
  readonly id = "openai-compatible";
  readonly model: string;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options: OpenAiCompatibleProviderOptions) {
    this.baseUrl = options.baseUrl;
    this.apiKey = options.apiKey;
    this.model = options.model;
  }

  async transform(
    request: TransformRequest,
    context: ProviderContext,
  ): Promise<ProviderResult> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: buildPrompt(request),
        stream: true,
        temperature: 0.3,
      }),
      signal: context.signal,
    });

    if (!response.ok) {
      throw new Error(`AI provider returned status ${response.status}.`);
    }

    if (!response.body) {
      throw new Error("AI provider returned an empty response body.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let usage: TransformUsage | undefined;

    const processLine = (line: string) => {
      if (!line.startsWith("data:")) {
        return;
      }

      const data = line.slice(5).trim();

      if (!data || data === "[DONE]") {
        return;
      }

      const chunk = JSON.parse(data) as ChatChunk;
      const text = chunk.choices?.[0]?.delta?.content;

      if (text) {
        context.onDelta(text);
      }

      if (chunk.usage) {
        usage = {
          inputTokens: chunk.usage.prompt_tokens,
          outputTokens: chunk.usage.completion_tokens,
        };
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        processLine(line);
      }

      if (done) {
        break;
      }
    }

    if (buffer.trim()) {
      processLine(buffer);
    }

    return { usage };
  }
}
