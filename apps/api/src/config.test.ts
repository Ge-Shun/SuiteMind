import { describe, expect, it } from "vitest";

import { loadConfig } from "./config";

describe("loadConfig", () => {
  it("keeps local mock development zero-config", () => {
    const config = loadConfig({ NODE_ENV: "development" });

    expect(config.provider).toBe("mock");
    expect(config.apiBearerToken).toBe("");
    expect(config.rateLimitMax).toBe(30);
    expect(config.maxOutputChars).toBe(20_000);
    expect(config.maxConcurrentRequests).toBe(4);
  });

  it("rejects a short API bearer token", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "development",
        API_BEARER_TOKEN: "too-short",
      }),
    ).toThrow("at least 16 characters");
  });

  it("does not allow the mock provider accidentally in production", () => {
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow(
      "mock AI provider is disabled",
    );
  });
});
