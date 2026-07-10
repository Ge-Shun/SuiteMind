import type { AppConfig } from "../config";
import { MockProvider } from "./mock";
import { OpenAiCompatibleProvider } from "./openai-compatible";
import type { TransformProvider } from "./types";

export function createProvider(config: AppConfig): TransformProvider {
  if (config.provider === "openai-compatible") {
    return new OpenAiCompatibleProvider({
      baseUrl: config.aiBaseUrl,
      apiKey: config.aiApiKey,
      model: config.aiModel,
    });
  }

  return new MockProvider();
}

export type { TransformProvider } from "./types";
