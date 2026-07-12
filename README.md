# SuiteMind

SuiteMind is a static BYOK (Bring Your Own Key) AI add-in for Microsoft Word.
Users connect their own model provider, review every generated result, and decide
when document content may be changed.

## Current Scope

The current release focuses on Word:

1. Select text, or place the cursor in a non-empty paragraph.
2. Ask a question or choose an editing action.
3. Stream the result directly from the selected AI provider.
4. Review the answer or text change in the task pane.
5. Copy an answer, replace the tracked source, or insert the result below it.

Available actions:

- Ask a question about the selected text
- Polish
- Rewrite
- Translate
- Summarize
- Continue writing
- Custom edit

Excel and PowerPoint remain out of scope until the Word workflow is stable.

## BYOK Architecture

```text
Microsoft Word
  -> SuiteMind task pane
  -> user's selected model provider
```

SuiteMind does not provide a shared model API key or relay server. Users enter
their own provider URL, API key, and model. Official OpenAI uses the Responses
API; OpenAI-compatible, DeepSeek, Claude, and Gemini providers are called
directly from the Office task pane through their respective APIs.

The API key is kept only in the current task pane's memory and is removed when
the pane reloads or closes. Provider choice, API URL, and model can be saved, but
the key is never written to local storage, committed to the repository, or sent
to a SuiteMind server.

Direct provider calls require browser/Office WebView CORS support. A valid key
can still fail when a provider blocks cross-origin requests. For an
An OpenAI or OpenAI-compatible provider that blocks CORS can use the temporary
local proxy:

```powershell
npm run proxy:certs
npm run proxy:local
```

For the GitHub Pages deployment, set `SUITEMIND_PROXY_ALLOWED_ORIGINS` to
`https://ge-shun.github.io` before starting the proxy.

The add-in first tries the provider directly and automatically falls back to
`https://localhost:3001` when direct browser access fails. The proxy runs only
on the current computer, accepts requests only from configured origins, and does
not persist or log the API key. The certificate installation command is required
only once per computer.

## Product Principles

- Explicit writes: generated content never changes Word before confirmation.
- Text-only AI boundary: model output is never executed as JavaScript or Office.js.
- Minimal access: only the current selection or paragraph is read.
- Stale-source protection: changed source text is rejected before writing.
- Reversible edits: Word-native writes remain undoable.
- User-owned credentials and model usage.

## Repository Layout

```text
SuiteMind/
|-- apps/
|   `-- word-addin/       # React task pane and Office.js integration
|-- packages/
|   `-- contracts/        # Shared request and operation schemas
|-- docs/
|   |-- development.md
|   |-- deployment.md
|   `-- word-plan.md
|-- scripts/
`-- package.json
```

## Quick Start

Requirements: Node.js 22.12 or newer and npm 10 or newer.

```powershell
npm install
npm run dev
```

Open the browser UI at:

```text
https://localhost:3000/taskpane.html?mockOffice=1
```

The browser view mocks Word selection and writing. Enter a provider API key in
Model settings to run an AI request.

To sideload into Word desktop:

```powershell
npm run sideload:word
```

See [docs/development.md](docs/development.md) for local development and
[docs/deployment.md](docs/deployment.md) for GitHub Pages deployment.
