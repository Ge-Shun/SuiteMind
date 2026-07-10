import {
  transformStreamEventSchema,
  type TransformRequest,
  type TransformStreamEvent,
} from "@suitemind/contracts";

import { normalizeProviderSettings, type ProviderSettings } from "./provider-settings";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");
const API_TOKEN = import.meta.env.VITE_API_TOKEN ?? "";

function buildApiHeaders(): Record<string, string> {
  return API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {};
}

export class SuiteMindApiError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "SuiteMindApiError";
    this.code = code;
    this.retryable = retryable;
  }
}

interface TransformOptions {
  providerSettings?: ProviderSettings;
}

interface TransformCallbacks {
  signal: AbortSignal;
  onDelta: (text: string) => void;
  onDone?: (event: Extract<TransformStreamEvent, { type: "done" }>) => void;
}

function parseSseBlock(block: string): TransformStreamEvent | null {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");

  if (!data) {
    return null;
  }

  return transformStreamEventSchema.parse(JSON.parse(data));
}

async function readErrorResponse(response: Response): Promise<SuiteMindApiError> {
  try {
    const body = (await response.json()) as {
      code?: string;
      message?: string;
      error?: {
        code?: string;
        message?: string;
        status?: string;
        type?: string;
      };
    };
    return new SuiteMindApiError(
      body.code ??
        body.error?.code ??
        body.error?.status ??
        body.error?.type ??
        "HTTP_ERROR",
      body.message ??
        body.error?.message ??
        `Request failed with status ${response.status}.`,
      response.status === 429 || response.status >= 500,
    );
  } catch {
    return new SuiteMindApiError(
      "HTTP_ERROR",
      `Request failed with status ${response.status}.`,
      response.status === 429 || response.status >= 500,
    );
  }
}

const operationInstructions: Record<TransformRequest["operation"], string> = {
  polish:
    "Improve clarity, grammar, tone, and flow while preserving the meaning and level of detail.",
  rewrite:
    "Rewrite the text with fresh wording while preserving its meaning and important details.",
  translate:
    "Translate accurately and naturally. Preserve paragraph breaks, names, numbers, and domain terminology.",
  summarize:
    "Summarize the text concisely. Preserve the central claims, decisions, and important qualifications.",
  continue:
    "Continue the text naturally in the same language, tone, viewpoint, and formatting style.",
  custom: "Follow the user's editing instruction precisely.",
};

function buildPrompt(
  request: TransformRequest,
): [{ role: "system"; content: string }, { role: "user"; content: string }] {
  const systemParts = [
    "You are SuiteMind, an editing assistant embedded in Microsoft Word.",
    operationInstructions[request.operation],
    "Return only the transformed document text. Do not add commentary, labels, quotation marks, or markdown fences unless the user explicitly requests them.",
  ];

  if (request.documentLanguage) {
    systemParts.push(`The document language is ${request.documentLanguage}.`);
  }

  if (request.operation === "translate" && request.targetLanguage) {
    systemParts.push(`Translate into ${request.targetLanguage}.`);
  }

  const userParts = [];

  if (request.instruction) {
    userParts.push(`Instruction:\n${request.instruction}`);
  }

  userParts.push(`Document text:\n${request.text}`);

  return [
    { role: "system" as const, content: systemParts.join(" ") },
    { role: "user" as const, content: userParts.join("\n\n") },
  ];
}

interface PromptMessages {
  system: string;
  user: string;
}

function buildPromptMessages(request: TransformRequest): PromptMessages {
  const [system, user] = buildPrompt(request);

  return {
    system: system.content,
    user: user.content,
  };
}

function createDoneEvent(
  model: string,
): Extract<TransformStreamEvent, { type: "done" }> {
  return {
    type: "done",
    requestId: crypto.randomUUID(),
    model,
  };
}

async function readProviderStream(
  response: Response,
  callbacks: TransformCallbacks,
  processBlock: (block: string) => boolean,
): Promise<void> {
  if (!response.ok) {
    throw await readErrorResponse(response);
  }

  if (!response.body) {
    throw new SuiteMindApiError(
      "EMPTY_RESPONSE",
      "The AI provider returned no response body.",
      true,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      completed = processBlock(block) || completed;
    }

    if (done) break;
  }

  if (buffer.trim()) {
    completed = processBlock(buffer) || completed;
  }

  if (!completed) {
    throw new SuiteMindApiError(
      "INCOMPLETE_STREAM",
      "The AI provider stream ended before completion.",
      true,
    );
  }
}

function readSseData(block: string): string | null {
  const data = block
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");

  return data || null;
}

async function transformWithOpenAiCompatible(
  request: TransformRequest,
  callbacks: TransformCallbacks,
  settings: ProviderSettings,
): Promise<void> {
  const normalized = normalizeProviderSettings(settings);

  if (!normalized.baseUrl || !normalized.apiKey || !normalized.model) {
    throw new SuiteMindApiError(
      "PROVIDER_SETTINGS_REQUIRED",
      "Enter an API base URL, API key, and model in Provider settings.",
      false,
    );
  }

  const response = await fetch(`${normalized.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      Authorization: `Bearer ${normalized.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: normalized.model,
      messages: buildPrompt(request),
      stream: true,
    }),
    signal: callbacks.signal,
  });

  await readProviderStream(response, callbacks, (block) => {
    const data = readSseData(block);

    if (!data) return false;
    if (data.trim() === "[DONE]") {
      callbacks.onDone?.(createDoneEvent(normalized.model));
      return true;
    }

    const parsed = JSON.parse(data) as {
      choices?: Array<{
        delta?: { content?: string };
        finish_reason?: string | null;
      }>;
    };
    const choice = parsed.choices?.[0];
    const text = choice?.delta?.content;

    if (text) {
      callbacks.onDelta(text);
    }

    if (choice?.finish_reason) {
      callbacks.onDone?.(createDoneEvent(normalized.model));
      return true;
    }

    return false;
  });
}

async function transformWithClaude(
  request: TransformRequest,
  callbacks: TransformCallbacks,
  settings: ProviderSettings,
): Promise<void> {
  const normalized = normalizeProviderSettings(settings);

  if (!normalized.baseUrl || !normalized.apiKey || !normalized.model) {
    throw new SuiteMindApiError(
      "PROVIDER_SETTINGS_REQUIRED",
      "Enter a Claude API base URL, API key, and model in Provider settings.",
      false,
    );
  }

  const prompt = buildPromptMessages(request);
  const response = await fetch(`${normalized.baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "anthropic-dangerous-direct-browser-access": "true",
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
      "x-api-key": normalized.apiKey,
    },
    body: JSON.stringify({
      model: normalized.model,
      max_tokens: 4096,
      system: prompt.system,
      messages: [{ role: "user", content: prompt.user }],
      stream: true,
    }),
    signal: callbacks.signal,
  });

  await readProviderStream(response, callbacks, (block) => {
    const data = readSseData(block);

    if (!data) return false;

    const parsed = JSON.parse(data) as {
      type?: string;
      delta?: { text?: string };
    };

    if (parsed.type === "content_block_delta" && parsed.delta?.text) {
      callbacks.onDelta(parsed.delta.text);
    }

    if (parsed.type === "message_stop") {
      callbacks.onDone?.(createDoneEvent(normalized.model));
      return true;
    }

    return false;
  });
}

async function transformWithGemini(
  request: TransformRequest,
  callbacks: TransformCallbacks,
  settings: ProviderSettings,
): Promise<void> {
  const normalized = normalizeProviderSettings(settings);

  if (!normalized.baseUrl || !normalized.apiKey || !normalized.model) {
    throw new SuiteMindApiError(
      "PROVIDER_SETTINGS_REQUIRED",
      "Enter a Gemini API base URL, API key, and model in Provider settings.",
      false,
    );
  }

  const prompt = buildPromptMessages(request);
  const url = new URL(
    `${normalized.baseUrl}/models/${encodeURIComponent(
      normalized.model,
    )}:streamGenerateContent`,
  );
  url.searchParams.set("alt", "sse");
  url.searchParams.set("key", normalized.apiKey);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: prompt.system }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt.user }],
        },
      ],
    }),
    signal: callbacks.signal,
  });

  let receivedText = false;

  try {
    await readProviderStream(response, callbacks, (block) => {
      const data = readSseData(block);

      if (!data) return false;

      const parsed = JSON.parse(data) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
          finishReason?: string;
        }>;
      };
      const candidate = parsed.candidates?.[0];
      const text = candidate?.content?.parts?.map((part) => part.text ?? "").join("");

      if (text) {
        receivedText = true;
        callbacks.onDelta(text);
      }

      if (candidate?.finishReason) {
        callbacks.onDone?.(createDoneEvent(normalized.model));
        return true;
      }

      return false;
    });
  } catch (error) {
    if (
      receivedText &&
      error instanceof SuiteMindApiError &&
      error.code === "INCOMPLETE_STREAM"
    ) {
      callbacks.onDone?.(createDoneEvent(normalized.model));
      return;
    }

    throw error;
  }
}

async function transformWithDirectProvider(
  request: TransformRequest,
  callbacks: TransformCallbacks,
  settings: ProviderSettings,
): Promise<void> {
  if (settings.mode === "claude") {
    return transformWithClaude(request, callbacks, settings);
  }

  if (settings.mode === "gemini") {
    return transformWithGemini(request, callbacks, settings);
  }

  return transformWithOpenAiCompatible(request, callbacks, settings);
}

export async function transformText(
  request: TransformRequest,
  callbacks: TransformCallbacks,
  options: TransformOptions = {},
): Promise<void> {
  if (options.providerSettings && options.providerSettings.mode !== "suitemind") {
    return transformWithDirectProvider(request, callbacks, options.providerSettings);
  }
  const response = await fetch(`${API_BASE_URL}/v1/transform`, {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      ...buildApiHeaders(),
    },
    body: JSON.stringify(request),
    signal: callbacks.signal,
  });

  if (!response.ok) {
    throw await readErrorResponse(response);
  }

  if (!response.body) {
    throw new SuiteMindApiError(
      "EMPTY_RESPONSE",
      "The SuiteMind API returned no response body.",
      true,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;

  const processBlock = (block: string) => {
    const event = parseSseBlock(block);

    if (!event) {
      return;
    }

    if (event.type === "delta") {
      callbacks.onDelta(event.text);
    } else if (event.type === "done") {
      completed = true;
      callbacks.onDone?.(event);
    } else {
      throw new SuiteMindApiError(event.code, event.message, event.retryable);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      processBlock(block);
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    processBlock(buffer);
  }

  if (!completed) {
    throw new SuiteMindApiError(
      "INCOMPLETE_STREAM",
      "The SuiteMind API stream ended before completion.",
      true,
    );
  }
}

export async function checkApiHealth(): Promise<{
  provider: string;
  model: string;
}> {
  const response = await fetch(`${API_BASE_URL}/health`, {
    headers: buildApiHeaders(),
  });

  if (!response.ok) {
    throw new Error("SuiteMind API is unavailable.");
  }

  return (await response.json()) as { provider: string; model: string };
}
