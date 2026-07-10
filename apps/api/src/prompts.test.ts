import { describe, expect, it } from "vitest";

import { buildPrompt } from "./prompts";

describe("buildPrompt", () => {
  it("adds the translation target and keeps the source text", () => {
    const messages = buildPrompt({
      operation: "translate",
      text: "Hello",
      instruction: "",
      targetLanguage: "Chinese",
    });

    expect(messages[0]?.content).toContain("Translate into Chinese");
    expect(messages[1]?.content).toContain("Hello");
  });

  it("keeps custom instructions separate from document text", () => {
    const messages = buildPrompt({
      operation: "custom",
      text: "Draft",
      instruction: "Make this formal",
    });

    expect(messages[1]?.content).toBe(
      "Instruction:\nMake this formal\n\nDocument text:\nDraft",
    );
  });
});
