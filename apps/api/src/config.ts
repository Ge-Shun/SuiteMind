import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8787),
  HOST: z.string().default("127.0.0.1"),
  CORS_ORIGINS: z.string().default("https://localhost:3000,http://localhost:3000"),
  AI_PROVIDER: z.enum(["mock", "openai-compatible"]).default("mock"),
  AI_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  AI_API_KEY: z.string().optional().default(""),
  AI_MODEL: z.string().optional().default(""),
  API_BEARER_TOKEN: z.string().optional().default(""),
  MAX_INPUT_CHARS: z.coerce.number().int().positive().max(10_000).default(10_000),
  MAX_OUTPUT_CHARS: z.coerce.number().int().positive().max(100_000).default(20_000),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().max(300_000).default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().max(10_000).default(30),
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .max(3_600_000)
    .default(60_000),
  MAX_CONCURRENT_REQUESTS: z.coerce.number().int().positive().max(100).default(4),
  TRUST_PROXY: z.enum(["true", "false"]).default("false"),
  ALLOW_MOCK_PROVIDER: z.enum(["true", "false"]).default("false"),
});

export type AppConfig = ReturnType<typeof loadConfig>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env) {
  const parsed = configSchema.parse(source);

  if (parsed.AI_PROVIDER === "openai-compatible") {
    if (!parsed.AI_API_KEY) {
      throw new Error("AI_API_KEY is required for the openai-compatible provider.");
    }

    if (!parsed.AI_MODEL) {
      throw new Error("AI_MODEL is required for the openai-compatible provider.");
    }
  }

  if (parsed.API_BEARER_TOKEN && parsed.API_BEARER_TOKEN.length < 16) {
    throw new Error("API_BEARER_TOKEN must contain at least 16 characters.");
  }

  if (
    parsed.NODE_ENV === "production" &&
    parsed.AI_PROVIDER === "mock" &&
    parsed.ALLOW_MOCK_PROVIDER !== "true"
  ) {
    throw new Error(
      "The mock AI provider is disabled in production. Set a real provider or explicitly set ALLOW_MOCK_PROVIDER=true.",
    );
  }

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    host: parsed.HOST,
    corsOrigins: parsed.CORS_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    provider: parsed.AI_PROVIDER,
    aiBaseUrl: parsed.AI_BASE_URL.replace(/\/$/, ""),
    aiApiKey: parsed.AI_API_KEY,
    aiModel: parsed.AI_MODEL,
    apiBearerToken: parsed.API_BEARER_TOKEN,
    maxInputChars: parsed.MAX_INPUT_CHARS,
    maxOutputChars: parsed.MAX_OUTPUT_CHARS,
    requestTimeoutMs: parsed.REQUEST_TIMEOUT_MS,
    rateLimitMax: parsed.RATE_LIMIT_MAX,
    rateLimitWindowMs: parsed.RATE_LIMIT_WINDOW_MS,
    maxConcurrentRequests: parsed.MAX_CONCURRENT_REQUESTS,
    trustProxy: parsed.TRUST_PROXY === "true",
  };
}
