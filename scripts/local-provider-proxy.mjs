import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";

const port = Number(process.env.SUITEMIND_PROXY_PORT || 3001);
const certDirectory = path.join(os.homedir(), ".office-addin-dev-certs");
const certificatePath =
  process.env.SSL_CRT_FILE || path.join(certDirectory, "localhost.crt");
const privateKeyPath =
  process.env.SSL_KEY_FILE || path.join(certDirectory, "localhost.key");
const proxyPath = "/api/provider/chat/completions";
const maximumBodyBytes = 2 * 1024 * 1024;
const defaultAllowedOrigins = ["https://localhost:3000", "https://127.0.0.1:3000"];

function normalizeOrigin(value) {
  const origin = new URL(value).origin;

  if (!origin.startsWith("https://")) {
    throw new Error(`Proxy origins must use HTTPS: ${value}`);
  }

  return origin;
}

const allowedOrigins = new Set(
  (process.env.SUITEMIND_PROXY_ALLOWED_ORIGINS || defaultAllowedOrigins.join(","))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeOrigin),
);

function isOriginAllowed(request) {
  const origin = request.headers.origin;
  return !origin || allowedOrigins.has(origin);
}

function corsHeaders(request) {
  const origin = request.headers.origin;

  return {
    "Access-Control-Allow-Headers":
      "Accept, Authorization, Content-Type, X-SuiteMind-Target-Url",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    ...(origin && allowedOrigins.has(origin)
      ? { "Access-Control-Allow-Origin": origin }
      : {}),
    "Access-Control-Allow-Private-Network": "true",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
}

function sendJson(request, response, status, payload) {
  response.writeHead(status, {
    ...corsHeaders(request),
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;

      if (size > maximumBodyBytes) {
        reject(new Error("Request body is too large."));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function normalizeTarget(value) {
  if (!value || Array.isArray(value)) {
    throw new Error("Missing target provider URL.");
  }

  const target = new URL(String(value));

  if (target.protocol !== "https:") {
    throw new Error("The target provider URL must use HTTPS.");
  }

  if (!target.pathname.endsWith("/chat/completions")) {
    throw new Error("Only OpenAI-compatible chat completions endpoints are allowed.");
  }

  return target;
}

async function proxyProviderRequest(request, response) {
  let body;
  let target;

  try {
    body = await readBody(request);
    target = normalizeTarget(request.headers["x-suitemind-target-url"]);
  } catch (error) {
    sendJson(request, response, 400, {
      error: { message: error instanceof Error ? error.message : String(error) },
    });
    return;
  }

  const controller = new AbortController();
  request.on("aborted", () => controller.abort());
  response.on("close", () => {
    if (!response.writableEnded) controller.abort();
  });

  try {
    const upstream = await fetch(target, {
      method: "POST",
      headers: {
        Accept: request.headers.accept || "text/event-stream",
        Authorization: request.headers.authorization || "",
        "Content-Type": request.headers["content-type"] || "application/json",
      },
      body,
      signal: controller.signal,
    });

    response.writeHead(upstream.status, {
      ...corsHeaders(request),
      "Content-Type":
        upstream.headers.get("content-type") || "application/octet-stream",
    });

    if (!upstream.body) {
      response.end();
      return;
    }

    Readable.fromWeb(upstream.body).pipe(response);
  } catch (error) {
    if (!response.headersSent) {
      sendJson(request, response, 502, {
        error: {
          message: `Local proxy could not reach the provider: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      });
    } else {
      response.destroy(error instanceof Error ? error : undefined);
    }
  }
}

async function requestHandler(request, response) {
  if (!isOriginAllowed(request)) {
    sendJson(request, response, 403, {
      error: { message: "This origin is not allowed to use the local proxy." },
    });
    return;
  }

  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders(request));
    response.end();
    return;
  }

  const requestUrl = new URL(request.url || "/", `https://localhost:${port}`);

  if (request.method === "POST" && requestUrl.pathname === proxyPath) {
    await proxyProviderRequest(request, response);
    return;
  }

  sendJson(request, response, 404, { error: { message: "Not found." } });
}

if (!fs.existsSync(certificatePath) || !fs.existsSync(privateKeyPath)) {
  throw new Error(
    "Trusted localhost certificates are missing. Run npm run proxy:certs once, then start the proxy again.",
  );
}

https
  .createServer(
    {
      cert: fs.readFileSync(certificatePath),
      key: fs.readFileSync(privateKeyPath),
    },
    requestHandler,
  )
  .listen(port, "localhost", () => {
    console.log(
      `SuiteMind local provider proxy: https://localhost:${port}${proxyPath}`,
    );
    console.log(`Allowed origins: ${[...allowedOrigins].join(", ")}`);
  });
