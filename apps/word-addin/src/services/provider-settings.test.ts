import { beforeEach, describe, expect, it } from "vitest";

import {
  loadProviderSettings,
  PROVIDER_SETTINGS_STORAGE_KEY,
  saveProviderSettings,
} from "./provider-settings";

describe("provider settings storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("persists non-secret settings without the API key", () => {
    saveProviderSettings({
      mode: "openai-compatible",
      baseUrl: "https://provider.example/v1/",
      apiKey: "session-secret",
      model: "example-model",
    });

    expect(
      JSON.parse(window.localStorage.getItem(PROVIDER_SETTINGS_STORAGE_KEY) ?? "{}"),
    ).toEqual({
      mode: "openai-compatible",
      baseUrl: "https://provider.example/v1",
      model: "example-model",
    });
  });

  it("removes a legacy persisted API key while loading other settings", () => {
    window.localStorage.setItem(
      PROVIDER_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        mode: "deepseek",
        baseUrl: "https://api.deepseek.com",
        apiKey: "legacy-secret",
        model: "deepseek-chat",
      }),
    );

    expect(loadProviderSettings()).toEqual({
      mode: "deepseek",
      baseUrl: "https://api.deepseek.com",
      apiKey: "",
      model: "deepseek-chat",
    });
    expect(
      JSON.parse(window.localStorage.getItem(PROVIDER_SETTINGS_STORAGE_KEY) ?? "{}"),
    ).toEqual({
      mode: "deepseek",
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-chat",
    });
  });

  it("migrates the previous official OpenAI default to Responses", () => {
    window.localStorage.setItem(
      PROVIDER_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        mode: "openai-compatible",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
      }),
    );

    expect(loadProviderSettings()).toMatchObject({ mode: "openai", apiKey: "" });
    expect(
      JSON.parse(window.localStorage.getItem(PROVIDER_SETTINGS_STORAGE_KEY) ?? "{}"),
    ).toMatchObject({ mode: "openai" });
  });
});
