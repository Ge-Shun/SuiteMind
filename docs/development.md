# SuiteMind Development

## Prerequisites

- Node.js 22.12 or newer.
- npm 10 or newer.
- Microsoft Word desktop for host validation.

## Install

```powershell
npm install
npm run generate:icons
```

Office development certificates are generated and trusted automatically when
the Word development server starts.

## Browser Development

```powershell
npm run dev
```

Open:

```text
https://localhost:3000/taskpane.html?mockOffice=1
```

`mockOffice=1` replaces Office.js with an in-memory Word adapter. It simulates
selection, replacement, insertion, stale-source checks, and review states. It
does not provide a mock AI model. Configure a provider in Model settings before
generating.

Provider settings are entered at runtime, not in `.env` files:

- provider
- API base URL
- API key
- model

Provider, API base URL, and model are stored in local storage. The API key stays
only in the current task pane's memory and must be entered again after a reload
or restart. Loading settings from an older version removes any previously saved
key. The task pane offers provider-specific model presets while still allowing a
custom model name. Provider URLs are normalized on blur, must use HTTPS, and may
use HTTP only for localhost testing.

## Local Provider Proxy

OpenAI Responses and OpenAI-compatible providers that block browser CORS can be
used through the temporary local HTTPS proxy:

```powershell
npm run proxy:certs
npm run proxy:local
```

For a deployed add-in, allow its exact HTTPS origin when starting the proxy:

```powershell
$env:SUITEMIND_PROXY_ALLOWED_ORIGINS="https://ge-shun.github.io"
npm run proxy:local
```

Keep that terminal running while generating. The add-in first tries the provider
directly, then automatically retries through:

```text
https://localhost:3001/api/provider/chat/completions
```

The proxy uses the trusted Office localhost certificate, listens only on the
current computer, accepts requests only from its configured HTTPS origins,
accepts only HTTPS `/responses` or `/chat/completions` targets, streams the
provider response, and does not persist or log the API key or document text.
Local development origins are allowed by default. Run `npm run proxy:certs` only
once per computer.

## Word Desktop Sideloading

```powershell
npm run sideload:word
```

Stop the Office debugging registration with:

```powershell
npm run stop:word
```

## Commands

```powershell
npm run format:check
npm run typecheck
npm test
npm run e2e:word
npm run build
npm run validate:manifest -w @suitemind/word-addin
```

## Browser E2E

The Word add-in has Playwright coverage for the browser task pane with
`mockOffice=1`. The E2E runner starts a Vite test-mode server and a local fake
OpenAI-compatible streaming provider, so it does not require Word or a real API
key. It uses the installed Google Chrome browser by default.

```powershell
npm run e2e:word
```

The fake provider is also available directly for manual browser testing:

```powershell
npm run fake-provider -w @suitemind/word-addin
```

## Manual Word Regression

Before a beta release, validate the add-in in Word desktop and Word on the web:

- provider authentication, direct CORS, and local proxy fallback;
- ask, copy answer, and insert below;
- polish, rewrite, translate, summarize, continue, and custom edit;
- long selections that trigger chunked generation;
- replace and insert with Word Undo;
- stale-source rejection after editing the original selection during generation;
- multi-paragraph insert-below style inheritance;
- Chinese, English, and mixed-language text.

## Security Boundary

- Document content is sent only after the user starts an action.
- Provider credentials are held only in task pane memory and sent directly to
  the provider or through the temporary localhost proxy.
- No SuiteMind backend receives credentials or document text.
- Model output is text only.
- No Word mutation occurs before explicit confirmation.
- Answers can be copied or inserted, but do not replace source text by default.
- Editing results use tracked Word objects and stale-content fingerprints.

## Current Formatting Boundary

Replacement operates on text ranges and cannot preserve every mixed inline
formatting run. Insert-below splits multi-paragraph results into Word paragraphs
and applies the source paragraph style to each inserted paragraph. In real Word,
insert-below wraps inserted paragraphs in `SuiteMind Draft` content controls so
the draft blocks are visible and can be located later. Formatting-aware OOXML
editing remains a later enhancement.

## Current Long-Text Boundary

Single provider calls are kept under 10,000 characters. Longer selections are
processed client-side in chunks up to a 60,000 character selection limit. Ask
and summarize use a chunk-and-combine flow, editing and translation actions
process chunks independently, and continue writing uses the end of the selected
text as context.

The manifest requires `WordApi 1.3`.
