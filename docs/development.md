# SuiteMind Development

## Prerequisites

- Node.js 20 or newer.
- npm 10 or newer.
- Microsoft Word desktop for Office sideloading.

The browser demo works without Word and without an AI API key.

## Install

```powershell
npm install
npm run generate:icons
```

Office development certificates are generated and trusted automatically the
first time the Word development server starts.

## Browser Demo

Start the API and task pane together:

```powershell
npm run dev
```

Open:

```text
https://localhost:3000/taskpane.html?mockOffice=1
```

The demo uses an in-memory Word adapter and the streaming mock AI provider. It
exercises the same UI, API contract, review flow, and tracked-source checks as
the Word-hosted build.

## Word Desktop Sideloading

Close any existing SuiteMind development session, then run:

```powershell
npm run sideload:word
```

This command starts the API, starts the HTTPS task-pane server if port 3000 is
not already in use, registers `apps/word-addin/manifest.xml`, and opens Word.

Stop the registered Office debugging session with:

```powershell
npm run stop:word
```

## AI Provider Configuration

The API defaults to the mock provider. To use an OpenAI-compatible API, create
`apps/api/.env` from `apps/api/.env.example` and set:

```dotenv
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://your-provider.example/v1
AI_API_KEY=your-server-side-key
AI_MODEL=your-model-id
API_BEARER_TOKEN=optional-private-deployment-token
MAX_OUTPUT_CHARS=20000
RATE_LIMIT_MAX=30
RATE_LIMIT_WINDOW_MS=60000
```

`AI_BASE_URL` must be the API root immediately before `/chat/completions`.

The API key is read only by `apps/api`. Never put a model key in a `VITE_*`
variable because Vite exposes those values to the task-pane bundle.

When `API_BEARER_TOKEN` is configured, set the matching `VITE_API_TOKEN` only
for a private single-user build. Do not embed a shared secret in a public add-in.

For a deployed task pane, set `VITE_API_BASE_URL` to the public HTTPS SuiteMind
API URL during the frontend build. Local development uses the Vite `/api`
same-origin proxy to avoid mixed-content restrictions in Office.

## Commands

```powershell
npm run typecheck
npm test
npm run build
npm run format:check
npm run validate:manifest -w @suitemind/word-addin
```

## Security Model

- Document content is sent only when the user starts an action.
- The API does not log request bodies or document text by default.
- Model credentials remain on the server.
- Model output is treated as text, never executable JavaScript or Office.js.
- No document mutation occurs before explicit user confirmation.
- The original Word range is tracked across the AI request.
- A non-empty current paragraph is used when no text is selected.
- The tracked range is fingerprinted again before a write.
- Changed source content is rejected instead of being overwritten silently.
- AI request rate and output-size limits are enforced server-side.
- CORS responses are limited to configured origins.

## Current Formatting Boundary

MVP rewrites operate on selected text. Insert-below inherits the source
paragraph style, and replacement uses Word's native range insertion. A rewrite
still cannot preserve every mixed inline formatting run inside the original
selection. Formatting-aware OOXML or content-control editing remains a later
enhancement.

The add-in manifest requires `WordApi 1.3`, matching the paragraph collection
and tracked-range APIs used at runtime.
