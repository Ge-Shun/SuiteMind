export type ProviderMode =
  "openai" | "openai-compatible" | "deepseek" | "claude" | "gemini";

export interface ProviderSettings {
  mode: ProviderMode;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export interface ProviderModelPreset {
  label: string;
  model: string;
}

export type ProviderBaseUrlIssue = "required" | "invalid" | "insecure";

type PersistedProviderSettings = Omit<ProviderSettings, "apiKey">;

export const PROVIDER_SETTINGS_STORAGE_KEY = "suitemind-provider-settings";

export const providerModes = [
  "openai",
  "openai-compatible",
  "deepseek",
  "claude",
  "gemini",
] as const satisfies readonly ProviderMode[];

const defaultProviderSettingsByMode: Record<ProviderMode, ProviderSettings> = {
  openai: {
    mode: "openai",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    model: "gpt-4o-mini",
  },
  "openai-compatible": {
    mode: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    model: "gpt-4o-mini",
  },
  deepseek: {
    mode: "deepseek",
    baseUrl: "https://api.deepseek.com",
    apiKey: "",
    model: "deepseek-chat",
  },
  claude: {
    mode: "claude",
    baseUrl: "https://api.anthropic.com",
    apiKey: "",
    model: "claude-sonnet-4-5",
  },
  gemini: {
    mode: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    apiKey: "",
    model: "gemini-2.5-flash",
  },
};

export const providerModelPresets: Record<
  ProviderMode,
  readonly ProviderModelPreset[]
> = {
  openai: [
    { label: "GPT-4o mini", model: "gpt-4o-mini" },
    { label: "GPT-4o", model: "gpt-4o" },
    { label: "GPT-4.1 mini", model: "gpt-4.1-mini" },
  ],
  "openai-compatible": [
    { label: "GPT-4o mini", model: "gpt-4o-mini" },
    { label: "Qwen Plus", model: "qwen-plus" },
    { label: "Llama 3.1 70B", model: "llama-3.1-70b-instruct" },
  ],
  deepseek: [
    { label: "DeepSeek Chat", model: "deepseek-chat" },
    { label: "DeepSeek Reasoner", model: "deepseek-reasoner" },
  ],
  claude: [
    { label: "Claude Sonnet 4.5", model: "claude-sonnet-4-5" },
    { label: "Claude Haiku 3.5", model: "claude-3-5-haiku-latest" },
  ],
  gemini: [
    { label: "Gemini 2.5 Flash", model: "gemini-2.5-flash" },
    { label: "Gemini 2.5 Pro", model: "gemini-2.5-pro" },
  ],
};

export const defaultProviderSettings = defaultProviderSettingsByMode.openai;

export function getDefaultProviderSettings(mode: ProviderMode): ProviderSettings {
  return defaultProviderSettingsByMode[mode];
}

export function isProviderMode(value: unknown): value is ProviderMode {
  return (
    typeof value === "string" &&
    providerModes.includes(value as (typeof providerModes)[number])
  );
}

export function normalizeProviderSettings(
  settings: ProviderSettings,
): ProviderSettings {
  return {
    mode: settings.mode,
    baseUrl: normalizeProviderBaseUrl(settings.baseUrl),
    apiKey: settings.apiKey.trim(),
    model: settings.model.trim(),
  };
}

export function normalizeProviderBaseUrl(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const withProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return withProtocol.replace(/\/+$/, "");
}

export function getProviderBaseUrlIssue(value: string): ProviderBaseUrlIssue | null {
  const normalized = normalizeProviderBaseUrl(value);

  if (!normalized) {
    return "required";
  }

  try {
    const url = new URL(normalized);
    const isLocalhost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1";

    if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocalhost)) {
      return "insecure";
    }

    return null;
  } catch {
    return "invalid";
  }
}

export function hasCompleteProviderSettings(settings: ProviderSettings): boolean {
  const normalized = normalizeProviderSettings(settings);
  return Boolean(
    normalized.baseUrl &&
    !getProviderBaseUrlIssue(normalized.baseUrl) &&
    normalized.apiKey &&
    normalized.model,
  );
}

function isOfficialOpenAiBaseUrl(value: unknown): boolean {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    return (
      url.hostname.toLowerCase() === "api.openai.com" && /^\/v1\/?$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export function loadProviderSettings(): ProviderSettings {
  try {
    const savedSettings = window.localStorage.getItem(PROVIDER_SETTINGS_STORAGE_KEY);

    if (!savedSettings) {
      return defaultProviderSettings;
    }

    const parsed = JSON.parse(savedSettings) as Partial<ProviderSettings>;
    const storedMode = isProviderMode(parsed.mode) ? parsed.mode : "openai";
    const mode =
      storedMode === "openai-compatible" && isOfficialOpenAiBaseUrl(parsed.baseUrl)
        ? "openai"
        : storedMode;
    const defaults = getDefaultProviderSettings(mode);
    const settings = {
      mode,
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : defaults.baseUrl,
      apiKey: "",
      model: typeof parsed.model === "string" ? parsed.model : defaults.model,
    };

    if (Object.hasOwn(parsed, "apiKey") || parsed.mode !== mode) {
      persistProviderSettings(settings);
    }

    return settings;
  } catch {
    return defaultProviderSettings;
  }
}

export function saveProviderSettings(settings: ProviderSettings): void {
  persistProviderSettings(settings);
}

function persistProviderSettings(settings: ProviderSettings): void {
  try {
    const normalized = normalizeProviderSettings(settings);
    const persisted: PersistedProviderSettings = {
      mode: normalized.mode,
      baseUrl: normalized.baseUrl,
      model: normalized.model,
    };

    window.localStorage.setItem(
      PROVIDER_SETTINGS_STORAGE_KEY,
      JSON.stringify(persisted),
    );
  } catch {
    // The current session still keeps the settings when storage is unavailable.
  }
}
