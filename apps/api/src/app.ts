import { randomUUID, timingSafeEqual } from "node:crypto";

import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import {
  encodeSseEvent,
  errorEventSchema,
  transformRequestSchema,
} from "@suitemind/contracts";
import Fastify from "fastify";

import type { AppConfig } from "./config";
import type { TransformProvider } from "./providers";

export interface BuildAppOptions {
  config: AppConfig;
  provider: TransformProvider;
}

function hasValidBearerToken(
  authorization: string | undefined,
  expectedToken: string,
): boolean {
  if (!expectedToken) {
    return true;
  }

  const prefix = "Bearer ";

  if (!authorization?.startsWith(prefix)) {
    return false;
  }

  const provided = Buffer.from(authorization.slice(prefix.length), "utf8");
  const expected = Buffer.from(expectedToken, "utf8");

  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function buildApp({ config, provider }: BuildAppOptions) {
  let activeTransforms = 0;
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "test" ? "silent" : "info",
      redact: ["req.headers.authorization"],
    },
    bodyLimit: Math.max(32_768, config.maxInputChars * 4),
    trustProxy: config.trustProxy,
  });

  await app.register(cors, {
    origin: config.corsOrigins,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
  });

  await app.register(rateLimit, {
    global: false,
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindowMs,
    errorResponseBuilder: (_request, context) => ({
      statusCode: context.statusCode,
      error: "Too Many Requests",
      code: "RATE_LIMITED",
      message: "Too many AI requests. Try again shortly.",
    }),
  });

  app.get("/health", async () => ({
    status: "ok",
    provider: provider.id,
    model: provider.model,
  }));

  app.post(
    "/v1/transform",
    {
      config: {
        rateLimit: {
          max: config.rateLimitMax,
          timeWindow: config.rateLimitWindowMs,
        },
      },
      preHandler: async (request, reply) => {
        if (
          !hasValidBearerToken(request.headers.authorization, config.apiBearerToken)
        ) {
          return reply.code(401).send({
            code: "UNAUTHORIZED",
            message: "A valid SuiteMind API token is required.",
          });
        }
      },
    },
    async (request, reply) => {
      const parsed = transformRequestSchema.safeParse(request.body);

      if (!parsed.success) {
        return reply.code(400).send({
          code: "INVALID_REQUEST",
          message: "The transform request is invalid.",
          issues: parsed.error.flatten(),
        });
      }

      if (parsed.data.text.length > config.maxInputChars) {
        return reply.code(413).send({
          code: "INPUT_TOO_LARGE",
          message: `Selection exceeds ${config.maxInputChars} characters.`,
        });
      }

      if (activeTransforms >= config.maxConcurrentRequests) {
        return reply.code(503).send({
          code: "SERVER_BUSY",
          message: "SuiteMind is processing too many requests. Try again shortly.",
        });
      }

      activeTransforms += 1;
      const requestId = randomUUID();

      const responseHeaders: Record<string, string> = {
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "X-Request-Id": requestId,
        "X-Accel-Buffering": "no",
      };
      const requestOrigin = request.headers.origin;

      if (requestOrigin && config.corsOrigins.includes(requestOrigin)) {
        responseHeaders["Access-Control-Allow-Origin"] = requestOrigin;
        responseHeaders.Vary = "Origin";
      }

      reply.hijack();
      reply.raw.writeHead(200, responseHeaders);
      reply.raw.flushHeaders();

      const controller = new AbortController();
      let outputChars = 0;
      let outputLimitExceeded = false;
      const timeout = setTimeout(
        () => controller.abort(new Error("Request timed out.")),
        config.requestTimeoutMs,
      );
      const keepAlive = setInterval(() => reply.raw.write(": keep-alive\n\n"), 15_000);

      reply.raw.once("close", () => {
        if (!reply.raw.writableEnded) {
          controller.abort(new Error("Client disconnected."));
        }
      });

      try {
        const result = await provider.transform(parsed.data, {
          signal: controller.signal,
          onDelta: (text) => {
            outputChars += text.length;

            if (outputChars > config.maxOutputChars) {
              outputLimitExceeded = true;
              controller.abort(new Error("AI output exceeded the configured limit."));
              throw new Error("AI output exceeded the configured limit.");
            }

            reply.raw.write(encodeSseEvent({ type: "delta", text }));
          },
        });

        reply.raw.write(
          encodeSseEvent({
            type: "done",
            requestId,
            model: provider.model,
            usage: result.usage,
          }),
        );
      } catch (error) {
        if (!reply.raw.writableEnded && !reply.raw.destroyed) {
          const aborted = controller.signal.aborted;
          const event = errorEventSchema.parse({
            type: "error",
            code: outputLimitExceeded
              ? "OUTPUT_TOO_LARGE"
              : aborted
                ? "REQUEST_ABORTED"
                : "PROVIDER_ERROR",
            message: outputLimitExceeded
              ? `AI output exceeded ${config.maxOutputChars} characters.`
              : aborted
                ? "The request was cancelled or timed out."
                : error instanceof Error
                  ? error.message
                  : "Generation failed.",
            retryable: !aborted && !outputLimitExceeded,
          });
          reply.raw.write(encodeSseEvent(event));
        }
      } finally {
        clearTimeout(timeout);
        clearInterval(keepAlive);
        activeTransforms -= 1;
        reply.raw.end();
      }
    },
  );

  return app;
}
