import {
  transformRequestSchema,
  type TransformRequest,
  type TransformStreamEvent,
} from "@suitemind/contracts";

import { normalizeProviderSettings, type ProviderSettings } from "./provider-settings";

const LOCAL_PROVIDER_PROXY_URL =
  import.meta.env.VITE_LOCAL_PROVIDER_PROXY_URL ??
  "https://localhost:3001/api/provider/chat/completions";
export const LOCAL_CONNECTOR_HEALTH_URL = "https://localhost:3001/health";
const LOCAL_PROXY_UNAVAILABLE_MESSAGE =
  "Direct provider access was blocked and SuiteMind Connector is unavailable.";
const MAX_SINGLE_REQUEST_CHARACTERS = 10_000;
const MAX_LONG_REQUEST_CHARACTERS = 60_000;
const CHUNK_TARGET_CHARACTERS = 8_000;

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
  providerSettings: ProviderSettings;
}

export type ProviderTransport = "direct" | "local-proxy";

export interface ProviderConnectionResult {
  transport: ProviderTransport;
  receivedText: boolean;
}

export async function checkLocalConnector(signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(LOCAL_CONNECTOR_HEALTH_URL, {
      headers: { Accept: "application/json" },
      signal,
    });

    if (!response.ok) {
      return false;
    }

    const result = (await response.json()) as { status?: string };
    return result.status === "ready";
  } catch {
    return false;
  }
}

interface TransformCallbacks {
  signal: AbortSignal;
  onDelta: (text: string) => void;
  onDone?: (event: Extract<TransformStreamEvent, { type: "done" }>) => void;
  onTransport?: (transport: ProviderTransport) => void;
}

interface LongTransformCallbacks extends TransformCallbacks {
  onChunkStart?: (chunkIndex: number, chunkCount: number) => void;
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
  ask: "Answer the user's question using the document text as the source context. Do not rewrite the document unless the user explicitly asks for a rewritten version.",
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

export function buildPrompt(
  request: TransformRequest,
): [{ role: "system"; content: string }, { role: "user"; content: string }] {
  const systemParts = [
    "You are SuiteMind, an editing assistant embedded in Microsoft Word.",
    operationInstructions[request.operation],
    request.operation === "ask"
      ? "Return only the answer. Do not add a preamble, quotation marks, or markdown fences unless the user explicitly requests them."
      : "Return only the transformed document text. Do not add commentary, labels, quotation marks, or markdown fences unless the user explicitly requests them.",
  ];

  if (request.documentLanguage) {
    systemParts.push(`The document language is ${request.documentLanguage}.`);
  }

  if (request.operation === "translate" && request.targetLanguage) {
    systemParts.push(`Translate into ${request.targetLanguage}.`);
  }

  const userParts = [];

  if (request.instruction) {
    const label =
      request.operation === "ask"
        ? "Question"
        : request.operation === "custom"
          ? "Editing instruction"
          : "Additional instruction";
    userParts.push(`${label}:\n${request.instruction}`);
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

function parseProviderJson<T>(data: string, provider: string): T {
  try {
    return JSON.parse(data) as T;
  } catch {
    throw new SuiteMindApiError(
      "PROVIDER_STREAM_PARSE_ERROR",
      `${provider} returned a malformed streaming event.`,
      true,
    );
  }
}

async function fetchOpenAiCompatible(
  endpoint: string,
  apiKey: string,
  body: string,
  callbacks: TransformCallbacks,
): Promise<Response> {
  const headers = {
    Accept: "text/event-stream",
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body,
      signal: callbacks.signal,
    });
    callbacks.onTransport?.("direct");
    return response;
  } catch (directError) {
    if (callbacks.signal.aborted) {
      throw directError;
    }

    try {
      const response = await fetch(LOCAL_PROVIDER_PROXY_URL, {
        method: "POST",
        headers: {
          ...headers,
          "X-SuiteMind-Target-Url": endpoint,
        },
        body,
        signal: callbacks.signal,
      });
      callbacks.onTransport?.("local-proxy");
      return response;
    } catch (proxyError) {
      if (callbacks.signal.aborted) {
        throw proxyError;
      }

      throw new SuiteMindApiError(
        "LOCAL_PROXY_UNAVAILABLE",
        LOCAL_PROXY_UNAVAILABLE_MESSAGE,
        true,
      );
    }
  }
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

  const endpoint = `${normalized.baseUrl}/chat/completions`;
  const body = JSON.stringify({
    model: normalized.model,
    messages: buildPrompt(request),
    stream: true,
  });
  const response = await fetchOpenAiCompatible(
    endpoint,
    normalized.apiKey,
    body,
    callbacks,
  );

  await readProviderStream(response, callbacks, (block) => {
    const data = readSseData(block);

    if (!data) return false;
    if (data.trim() === "[DONE]") {
      callbacks.onDone?.(createDoneEvent(normalized.model));
      return true;
    }

    const parsed = parseProviderJson<{
      choices?: Array<{
        delta?: { content?: string };
        finish_reason?: string | null;
      }>;
    }>(data, "OpenAI-compatible provider");
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

async function transformWithOpenAiResponses(
  request: TransformRequest,
  callbacks: TransformCallbacks,
  settings: ProviderSettings,
): Promise<void> {
  const normalized = normalizeProviderSettings(settings);

  if (!normalized.baseUrl || !normalized.apiKey || !normalized.model) {
    throw new SuiteMindApiError(
      "PROVIDER_SETTINGS_REQUIRED",
      "Enter an OpenAI API base URL, API key, and model in Provider settings.",
      false,
    );
  }

  const prompt = buildPromptMessages(request);
  const response = await fetchOpenAiCompatible(
    `${normalized.baseUrl}/responses`,
    normalized.apiKey,
    JSON.stringify({
      model: normalized.model,
      instructions: prompt.system,
      input: prompt.user,
      stream: true,
      // Word selections are sensitive document content, so do not retain server-side state.
      store: false,
    }),
    callbacks,
  );

  await readProviderStream(response, callbacks, (block) => {
    const data = readSseData(block);

    if (!data) return false;

    const parsed = parseProviderJson<{
      type?: string;
      delta?: string;
      response?: {
        id?: string;
        model?: string;
        error?: { code?: string; message?: string };
      };
      error?: { code?: string; message?: string };
    }>(data, "OpenAI Responses API");

    if (parsed.type === "response.output_text.delta" && parsed.delta) {
      callbacks.onDelta(parsed.delta);
      return false;
    }

    if (
      parsed.type === "error" ||
      parsed.type === "response.failed" ||
      parsed.type === "response.incomplete"
    ) {
      throw new SuiteMindApiError(
        parsed.error?.code ?? parsed.response?.error?.code ?? "RESPONSES_ERROR",
        parsed.error?.message ??
          parsed.response?.error?.message ??
          "The OpenAI Responses API returned an error.",
        true,
      );
    }

    if (parsed.type === "response.completed") {
      callbacks.onDone?.({
        type: "done",
        requestId: parsed.response?.id ?? crypto.randomUUID(),
        model: parsed.response?.model ?? normalized.model,
      });
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
  callbacks.onTransport?.("direct");

  await readProviderStream(response, callbacks, (block) => {
    const data = readSseData(block);

    if (!data) return false;

    const parsed = parseProviderJson<{
      type?: string;
      delta?: { text?: string };
      error?: { type?: string; message?: string };
    }>(data, "Claude");

    if (parsed.type === "error") {
      throw new SuiteMindApiError(
        parsed.error?.type ?? "CLAUDE_STREAM_ERROR",
        parsed.error?.message ?? "Claude returned a streaming error.",
        true,
      );
    }

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

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      "x-goog-api-key": normalized.apiKey,
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
  callbacks.onTransport?.("direct");

  let receivedText = false;

  try {
    await readProviderStream(response, callbacks, (block) => {
      const data = readSseData(block);

      if (!data) return false;

      const parsed = parseProviderJson<{
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
          finishReason?: string;
        }>;
        error?: { code?: number; message?: string; status?: string };
      }>(data, "Gemini");

      if (parsed.error) {
        throw new SuiteMindApiError(
          parsed.error.status ?? String(parsed.error.code ?? "GEMINI_STREAM_ERROR"),
          parsed.error.message ?? "Gemini returned a streaming error.",
          true,
        );
      }
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

  if (settings.mode === "openai") {
    return transformWithOpenAiResponses(request, callbacks, settings);
  }

  return transformWithOpenAiCompatible(request, callbacks, settings);
}

export async function transformText(
  request: TransformRequest,
  callbacks: TransformCallbacks,
  options: TransformOptions,
): Promise<void> {
  const parsedRequest = transformRequestSchema.safeParse(request);

  if (!parsedRequest.success) {
    throw new SuiteMindApiError(
      "INVALID_REQUEST",
      parsedRequest.error.issues[0]?.message ?? "The transform request is invalid.",
      false,
    );
  }

  return transformWithDirectProvider(
    parsedRequest.data,
    callbacks,
    options.providerSettings,
  );
}

function splitTextIntoChunks(text: string): string[] {
  if (text.length <= MAX_SINGLE_REQUEST_CHARACTERS) {
    return [text];
  }

  const chunks: string[] = [];
  const paragraphs = text.split(/\n{2,}/);
  let current = "";

  for (const part of paragraphs) {
    if (!part) continue;

    if (current && current.length + part.length > CHUNK_TARGET_CHARACTERS) {
      chunks.push(current);
      current = "";
    }

    if (part.length <= CHUNK_TARGET_CHARACTERS) {
      current += part;
      continue;
    }

    const sentences = part.split(/(?<=[.!?。！？；;])\s+/u);

    for (const sentence of sentences) {
      if (!sentence) continue;

      if (current && current.length + sentence.length > CHUNK_TARGET_CHARACTERS) {
        chunks.push(current);
        current = "";
      }

      if (sentence.length <= CHUNK_TARGET_CHARACTERS) {
        current += sentence;
        continue;
      }

      for (let index = 0; index < sentence.length; index += CHUNK_TARGET_CHARACTERS) {
        if (current) {
          chunks.push(current);
          current = "";
        }

        chunks.push(sentence.slice(index, index + CHUNK_TARGET_CHARACTERS));
      }
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

function withChunkInstruction(
  request: TransformRequest,
  chunkIndex: number,
  chunkCount: number,
): TransformRequest {
  const prefix = `This is chunk ${chunkIndex + 1} of ${chunkCount}. Process only this chunk.`;
  const instruction = request.instruction
    ? `${prefix}\n\n${request.instruction}`
    : prefix;

  return {
    ...request,
    instruction,
  };
}

async function transformChunksIndependently(
  request: TransformRequest,
  callbacks: LongTransformCallbacks,
  options: TransformOptions,
  chunks: string[],
): Promise<void> {
  for (const [index, chunk] of chunks.entries()) {
    callbacks.onChunkStart?.(index, chunks.length);

    if (index > 0) {
      callbacks.onDelta("\n\n");
    }

    await transformText(
      {
        ...withChunkInstruction(request, index, chunks.length),
        text: chunk,
      },
      callbacks,
      options,
    );
  }
}

async function reduceChunkedContext(
  request: TransformRequest,
  callbacks: LongTransformCallbacks,
  options: TransformOptions,
  chunks: string[],
): Promise<void> {
  const intermediateResults: string[] = [];

  for (const [index, chunk] of chunks.entries()) {
    callbacks.onChunkStart?.(index, chunks.length);
    let chunkResult = "";
    const chunkInstruction =
      request.operation === "ask"
        ? `Question: ${request.instruction}\n\nExtract only information from this chunk that helps answer the question. If the chunk has no relevant information, reply exactly: NO_RELEVANT_CONTEXT.`
        : "Summarize only this chunk, preserving concrete claims, decisions, numbers, and qualifications.";

    await transformText(
      {
        ...request,
        operation: request.operation === "ask" ? "ask" : "summarize",
        text: chunk,
        instruction: chunkInstruction,
        targetLanguage: null,
      },
      {
        ...callbacks,
        onDelta: (text) => {
          chunkResult += text;
        },
      },
      options,
    );

    const normalized = chunkResult.trim();

    if (normalized && normalized !== "NO_RELEVANT_CONTEXT") {
      intermediateResults.push(`Chunk ${index + 1}: ${normalized}`);
    }
  }

  if (!intermediateResults.length) {
    throw new SuiteMindApiError(
      "EMPTY_PROVIDER_RESULT",
      "The AI provider returned an empty result.",
      true,
    );
  }

  callbacks.onChunkStart?.(chunks.length, chunks.length);

  await transformText(
    {
      ...request,
      text: intermediateResults.join("\n\n").slice(0, MAX_SINGLE_REQUEST_CHARACTERS),
      instruction:
        request.operation === "ask"
          ? `Answer the original question using only these chunk-level notes.\n\nQuestion:\n${request.instruction}`
          : request.instruction
            ? `Combine these chunk summaries into one concise summary.\n\n${request.instruction}`
            : "Combine these chunk summaries into one concise summary.",
      targetLanguage: null,
    },
    callbacks,
    options,
  );
}

export async function transformLongText(
  request: TransformRequest,
  callbacks: LongTransformCallbacks,
  options: TransformOptions,
): Promise<void> {
  if (request.text.length > MAX_LONG_REQUEST_CHARACTERS) {
    throw new SuiteMindApiError(
      "SELECTION_TOO_LONG",
      `The selection is longer than ${MAX_LONG_REQUEST_CHARACTERS.toLocaleString(
        "en",
      )} characters.`,
      false,
    );
  }

  if (request.text.length <= MAX_SINGLE_REQUEST_CHARACTERS) {
    return transformText(request, callbacks, options);
  }

  if (request.operation === "continue") {
    return transformText(
      {
        ...request,
        text: request.text.slice(-MAX_SINGLE_REQUEST_CHARACTERS),
        instruction: request.instruction
          ? `Continue from the end of this long selection.\n\n${request.instruction}`
          : "Continue from the end of this long selection.",
      },
      callbacks,
      options,
    );
  }

  const chunks = splitTextIntoChunks(request.text);

  if (request.operation === "ask" || request.operation === "summarize") {
    return reduceChunkedContext(request, callbacks, options, chunks);
  }

  return transformChunksIndependently(request, callbacks, options, chunks);
}

export async function testProviderConnection(
  providerSettings: ProviderSettings,
  signal: AbortSignal,
): Promise<ProviderConnectionResult> {
  let transport: ProviderTransport = "direct";
  let receivedText = false;

  await transformText(
    {
      operation: "ask",
      text: "SuiteMind provider connection test.",
      instruction: "Reply with OK only.",
    },
    {
      signal,
      onDelta: (text) => {
        receivedText = receivedText || Boolean(text.trim());
      },
      onTransport: (nextTransport) => {
        transport = nextTransport;
      },
    },
    { providerSettings },
  );

  if (!receivedText) {
    throw new SuiteMindApiError(
      "EMPTY_PROVIDER_RESULT",
      "The AI provider returned an empty result.",
      true,
    );
  }

  return { transport, receivedText };
}
