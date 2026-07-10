import { describe, expect, it } from "vitest";

import { buildApp } from "./app";
import type { AppConfig } from "./config";
import { MockProvider } from "./providers/mock";
import type { TransformProvider } from "./providers/types";

const config: AppConfig = {
  nodeEnv: "test",
  port: 8787,
  host: "127.0.0.1",
  corsOrigins: ["http://localhost:3000"],
  provider: "mock",
  aiBaseUrl: "https://api.openai.com/v1",
  aiApiKey: "",
  aiModel: "",
  apiBearerToken: "",
  maxInputChars: 10_000,
  maxOutputChars: 20_000,
  requestTimeoutMs: 60_000,
  rateLimitMax: 30,
  rateLimitWindowMs: 60_000,
  maxConcurrentRequests: 4,
  trustProxy: false,
};

describe("SuiteMind API", () => {
  it("reports provider health", async () => {
    const app = await buildApp({ config, provider: new MockProvider() });
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      provider: "mock",
    });

    await app.close();
  });

  it("rejects an empty transform", async () => {
    const app = await buildApp({ config, provider: new MockProvider() });
    const response = await app.inject({
      method: "POST",
      url: "/v1/transform",
      payload: { operation: "polish", text: "" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "INVALID_REQUEST" });

    await app.close();
  });

  it("requires the configured bearer token", async () => {
    const app = await buildApp({
      config: {
        ...config,
        apiBearerToken: "0123456789abcdef",
      },
      provider: new MockProvider(),
    });
    const response = await app.inject({
      method: "POST",
      url: "/v1/transform",
      payload: { operation: "polish", text: "Draft" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: "UNAUTHORIZED" });

    await app.close();
  });

  it("rate limits repeated transform requests", async () => {
    const app = await buildApp({
      config: {
        ...config,
        rateLimitMax: 1,
      },
      provider: new MockProvider(),
    });

    await app.inject({
      method: "POST",
      url: "/v1/transform",
      payload: { operation: "polish", text: "" },
    });
    const response = await app.inject({
      method: "POST",
      url: "/v1/transform",
      payload: { operation: "polish", text: "" },
    });

    expect(response.statusCode).toBe(429);
    expect(response.json()).toMatchObject({ code: "RATE_LIMITED" });

    await app.close();
  });

  it("rejects a transform when the concurrent request limit is reached", async () => {
    const blockingProvider: TransformProvider = {
      id: "blocking",
      model: "blocking-model",
      async transform(_request, context) {
        await new Promise<never>((_resolve, reject) => {
          context.signal.addEventListener(
            "abort",
            () => reject(context.signal.reason),
            { once: true },
          );
        });
        return {};
      },
    };
    const app = await buildApp({
      config: {
        ...config,
        maxConcurrentRequests: 1,
      },
      provider: blockingProvider,
    });
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();

    if (!address || typeof address === "string") {
      throw new Error("Expected a TCP test server address.");
    }

    const url = `http://127.0.0.1:${address.port}/v1/transform`;
    const firstController = new AbortController();
    const firstResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "polish", text: "First" }),
      signal: firstController.signal,
    });
    const secondResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "polish", text: "Second" }),
    });

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(503);
    await expect(secondResponse.json()).resolves.toMatchObject({
      code: "SERVER_BUSY",
    });

    firstController.abort();
    await firstResponse.body?.cancel().catch(() => undefined);
    await app.close();
  });

  it("stops streaming when the output size limit is exceeded", async () => {
    const oversizedProvider: TransformProvider = {
      id: "oversized",
      model: "oversized-model",
      async transform(_request, context) {
        context.onDelta("123456");
        return {};
      },
    };
    const app = await buildApp({
      config: {
        ...config,
        maxOutputChars: 5,
      },
      provider: oversizedProvider,
    });
    await app.listen({ host: "127.0.0.1", port: 0 });
    const address = app.server.address();

    if (!address || typeof address === "string") {
      throw new Error("Expected a TCP test server address.");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/v1/transform`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation: "polish", text: "Draft" }),
    });
    const stream = await response.text();

    expect(response.status).toBe(200);
    expect(stream).toContain('"code":"OUTPUT_TOO_LARGE"');

    await app.close();
  });
});
