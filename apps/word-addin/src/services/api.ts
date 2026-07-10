import {
  transformStreamEventSchema,
  type TransformRequest,
  type TransformStreamEvent,
} from "@suitemind/contracts";

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
    };
    return new SuiteMindApiError(
      body.code ?? "HTTP_ERROR",
      body.message ?? `Request failed with status ${response.status}.`,
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

export async function transformText(
  request: TransformRequest,
  callbacks: TransformCallbacks,
): Promise<void> {
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
