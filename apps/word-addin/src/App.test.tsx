import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { UI_LANGUAGE_STORAGE_KEY } from "./i18n";

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
  checkApiHealth: vi.fn(async () => ({
    status: "ok",
    provider: "mock",
    model: "suitemind-mock",
  })),
  transformText: vi.fn(),
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

    expect(screen.getByRole("button", { name: "润色" })).toBeInTheDocument();
  });

  it("updates an active validation message when the language changes", async () => {
    window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, "zh-CN");
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "自定义" }));

    const generateButton = screen.getByRole("button", { name: "从 Word 生成" });
    await waitFor(() => expect(generateButton).toBeEnabled());
    fireEvent.click(generateButton);

    expect(screen.getByRole("status")).toHaveTextContent("请输入自定义操作指令。");

    fireEvent.click(screen.getByRole("switch", { name: "切换到英文" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Enter an instruction for the custom action.",
    );
  });
});
