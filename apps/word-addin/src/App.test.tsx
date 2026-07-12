import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { UI_LANGUAGE_STORAGE_KEY } from "./i18n";
import { testProviderConnection } from "./services/api";
import { PROVIDER_SETTINGS_STORAGE_KEY } from "./services/provider-settings";

vi.mock("./office", () => ({
  createOfficeAdapter: vi.fn(async () => ({
    mode: "mock" as const,
    readSelection: vi.fn(),
    apply: vi.fn(),
    release: vi.fn(),
  })),
  EmptySelectionError: class EmptySelectionError extends Error {},
  StaleSelectionError: class StaleSelectionError extends Error {},
  SelectionExpiredError: class SelectionExpiredError extends Error {},
}));

vi.mock("./services/api", () => ({
  SuiteMindApiError: class SuiteMindApiError extends Error {
    readonly code: string;
    readonly retryable: boolean;

    constructor(code: string, message: string, retryable = false) {
      super(message);
      this.code = code;
      this.retryable = retryable;
    }
  },
  testProviderConnection: vi.fn(),
  transformLongText: vi.fn(),
}));

describe("App language switcher", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, "en");
  });

  it("switches the interface to Chinese and persists the choice", () => {
    const { unmount } = render(<App />);

    fireEvent.click(screen.getByRole("switch", { name: "Switch to Chinese" }));

    fireEvent.click(screen.getByRole("tab", { name: "编辑" }));
    expect(screen.getByRole("button", { name: "润色" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "切换到英文" })).toBeChecked();
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY)).toBe("zh-CN");

    fireEvent.click(screen.getByRole("button", { name: "翻译" }));

    expect(screen.getByRole("combobox", { name: "目标语言" })).toHaveValue(
      "Chinese (Simplified)",
    );
    expect(screen.getByRole("option", { name: "简体中文" })).toBeInTheDocument();

    unmount();
    render(<App />);

    fireEvent.click(screen.getByRole("tab", { name: "编辑" }));
    expect(screen.getByRole("button", { name: "润色" })).toBeInTheDocument();
  });

  it("does not offer SuiteMind API in model provider settings", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Model settings" }));

    expect(screen.getByRole("combobox", { name: "Provider" })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "SuiteMind API" }),
    ).not.toBeInTheDocument();
  });

  it("hides the workspace while provider settings are open", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Model settings" }));

    expect(screen.getByRole("region", { name: "Model settings" })).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "AI workspace" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to workspace" }));

    expect(
      screen.queryByRole("region", { name: "Model settings" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "AI workspace" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Ask" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Edit" })).toBeInTheDocument();
  });

  it("updates an active validation message when the language changes", async () => {
    window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, "zh-CN");
    window.localStorage.setItem(
      PROVIDER_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        mode: "openai-compatible",
        baseUrl: "https://api.example.com/v1",
        apiKey: "legacy-saved-key",
        model: "example-model",
      }),
    );
    render(<App />);

    const generateButton = screen.getByRole("button", { name: "从 Word 生成" });
    await waitFor(() => expect(generateButton).toBeEnabled());
    fireEvent.click(generateButton);

    expect(screen.getByRole("status")).toHaveTextContent(
      "请在模型配置中填写完整的接口地址、API Key 和模型。",
    );

    fireEvent.click(screen.getByRole("switch", { name: "切换到英文" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Complete the API base URL, API key, and model in Model settings.",
    );
  });

  it("keeps the API key only in the current task pane session", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Model settings" }));

    const apiKeyInput = screen.getByLabelText("API key");
    fireEvent.change(apiKeyInput, { target: { value: "session-user-key" } });

    await waitFor(() => {
      const saved = JSON.parse(
        window.localStorage.getItem(PROVIDER_SETTINGS_STORAGE_KEY) ?? "{}",
      ) as { apiKey?: string };
      expect(saved.apiKey).toBeUndefined();
    });

    expect(apiKeyInput).toHaveValue("session-user-key");
    fireEvent.click(screen.getByRole("button", { name: "Clear API key" }));

    expect(apiKeyInput).toHaveValue("");
  });

  it("tests the active provider connection from model settings", async () => {
    vi.mocked(testProviderConnection).mockResolvedValueOnce({
      receivedText: true,
      transport: "direct",
    });
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Model settings" }));

    fireEvent.change(screen.getByLabelText("API key"), {
      target: { value: "session-user-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Test connection" }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Model connection works through direct provider access.",
      ),
    );
    expect(testProviderConnection).toHaveBeenCalled();
  });
});
