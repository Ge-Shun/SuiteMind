export type ProviderMode = "openai-compatible" | "deepseek" | "claude" | "gemini";

export interface ProviderSettings {
  mode: ProviderMode;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export const PROVIDER_SETTINGS_STORAGE_KEY = "suitemind-provider-settings";

export const providerModes = [
  "openai-compatible",
  "deepseek",
  "claude",
  "gemini",
] as const satisfies readonly ProviderMode[];

const defaultProviderSettingsByMode: Record<ProviderMode, ProviderSettings> = {
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

export const defaultProviderSettings =
  defaultProviderSettingsByMode["openai-compatible"];

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
    baseUrl: settings.baseUrl.trim().replace(/\/$/, ""),
    apiKey: settings.apiKey.trim(),
    model: settings.model.trim(),
  };
}

export function hasCompleteProviderSettings(settings: ProviderSettings): boolean {
  const normalized = normalizeProviderSettings(settings);
  return Boolean(normalized.baseUrl && normalized.apiKey && normalized.model);
}

export function loadProviderSettings(): ProviderSettings {
  try {
    const savedSettings = window.localStorage.getItem(PROVIDER_SETTINGS_STORAGE_KEY);

    if (!savedSettings) {
      return defaultProviderSettings;
    }

    const parsed = JSON.parse(savedSettings) as Partial<ProviderSettings>;
    const mode = isProviderMode(parsed.mode) ? parsed.mode : "openai-compatible";

    return {
      ...getDefaultProviderSettings(mode),
      ...parsed,
      mode,
    };
  } catch {
    return defaultProviderSettings;
  }
}

export function saveProviderSettings(settings: ProviderSettings): void {
  try {
    window.localStorage.setItem(
      PROVIDER_SETTINGS_STORAGE_KEY,
      JSON.stringify(normalizeProviderSettings(settings)),
    );
  } catch {
    // The current session still keeps the settings when storage is unavailable.
  }
}
