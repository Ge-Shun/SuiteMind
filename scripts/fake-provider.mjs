import http from "node:http";

const port = Number(process.env.SUITEMIND_FAKE_PROVIDER_PORT || 3002);
const host = process.env.SUITEMIND_FAKE_PROVIDER_HOST || "127.0.0.1";

function corsHeaders() {
  return {
    "Access-Control-Allow-Headers": "Accept, Authorization, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  };
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    ...corsHeaders(),
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function textFromMessages(messages) {
  return messages
    .map((message) => message.content)
    .filter((content) => typeof content === "string")
    .join("\n\n");
}

function createFakeResult(prompt) {
  if (/Reply with OK only\./i.test(prompt)) {
    return "OK";
  }

  const documentText = prompt.match(/Document text:\n([\s\S]*)$/)?.[1]?.trim() ?? "";

  if (/Question:/i.test(prompt)) {
    return `Fake answer based on: ${documentText.slice(0, 80)}`;
  }

  return `Fake transformed text:\n${documentText}`;
}

function writeSse(response, text) {
  response.writeHead(200, {
    ...corsHeaders(),
    "Content-Type": "text/event-stream; charset=utf-8",
    Connection: "keep-alive",
  });

  for (const chunk of text.match(/.{1,24}/gs) ?? [""]) {
    response.write(
      `data: ${JSON.stringify({
        choices: [{ delta: { content: chunk }, finish_reason: null }],
      })}\n\n`,
    );
  }

  response.write(
    `data: ${JSON.stringify({
      choices: [{ delta: {}, finish_reason: "stop" }],
    })}\n\n`,
  );
  response.end();
}

async function handleChatCompletions(request, response) {
  let payload;

  try {
    payload = JSON.parse(await readBody(request));
  } catch {
    sendJson(response, 400, { error: { message: "Invalid JSON body." } });
    return;
  }

  const prompt = textFromMessages(payload.messages ?? []);
  writeSse(response, createFakeResult(prompt));
}

const server = http.createServer((request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders());
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", `http://${host}:${port}`);

  if (request.method === "GET" && url.pathname === "/v1") {
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && url.pathname === "/v1/chat/completions") {
    void handleChatCompletions(request, response);
    return;
  }

  sendJson(response, 404, { error: { message: "Not found." } });
});

server.listen(port, host, () => {
  console.log(`SuiteMind fake provider: http://${host}:${port}/v1`);
});
