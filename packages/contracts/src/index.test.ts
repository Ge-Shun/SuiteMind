import { describe, expect, it } from "vitest";

import {
  encodeSseEvent,
  transformRequestSchema,
  transformStreamEventSchema,
} from "./index";

describe("transformRequestSchema", () => {
  it("requires a question for ask requests", () => {
    const result = transformRequestSchema.safeParse({
      operation: "ask",
      text: "Draft text",
      instruction: "   ",
    });

    expect(result.success).toBe(false);
  });

  it("accepts a standard polish request", () => {
    const result = transformRequestSchema.parse({
      operation: "polish",
      text: "Draft text",
    });

    expect(result.instruction).toBe("");
  });

  it("requires a target language for translation", () => {
    const result = transformRequestSchema.safeParse({
      operation: "translate",
      text: "Draft text",
    });

    expect(result.success).toBe(false);
  });

  it("requires an editing instruction for custom transforms", () => {
    const result = transformRequestSchema.safeParse({
      operation: "custom",
      text: "Draft text",
      instruction: "   ",
    });

    expect(result.success).toBe(false);
  });
});

describe("stream events", () => {
  it("encodes an event that the shared schema can parse", () => {
    const event = transformStreamEventSchema.parse({
      type: "delta",
      text: "hello",
    });

    expect(encodeSseEvent(event)).toBe(
      'event: delta\ndata: {"type":"delta","text":"hello"}\n\n',
    );
  });
});
