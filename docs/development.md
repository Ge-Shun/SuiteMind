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

The complete settings, including the key, are stored in local storage until the
user clicks **Clear saved API key**.

## Local Provider Proxy

OpenAI-compatible providers that block browser CORS can be used through the
temporary local HTTPS proxy:

```powershell
npm run proxy:certs
npm run proxy:local
```

For a deployed add-in, allow its exact HTTPS origin when starting the proxy:

```powershell
$env:SUITEMIND_PROXY_ALLOWED_ORIGINS="https://word.example.com"
npm run proxy:local
```

Keep that terminal running while generating. The add-in first tries the provider
directly, then automatically retries through:

```text
https://localhost:3001/api/provider/chat/completions
```

The proxy uses the trusted Office localhost certificate, listens only on the
current computer, accepts requests only from its configured HTTPS origins,
accepts only HTTPS `/chat/completions` targets, streams the provider response,
and does not persist or log the API key or document text. Local development
origins are allowed by default. Run `npm run proxy:certs` only once per computer.

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
npm run build
npm run validate:manifest -w @suitemind/word-addin
```

## Security Boundary

- Document content is sent only after the user starts an action.
- Provider credentials are stored locally and sent directly to the provider or
  through the temporary localhost proxy.
- No SuiteMind backend receives credentials or document text.
- Model output is text only.
- No Word mutation occurs before explicit confirmation.
- Answers can be copied or inserted, but do not replace source text by default.
- Editing results use tracked Word objects and stale-content fingerprints.

## Current Formatting Boundary

Replacement operates on text ranges and cannot preserve every mixed inline
formatting run. Insert-below inherits the source paragraph style. Formatting-
aware OOXML or content-control editing remains a later enhancement.

The manifest requires `WordApi 1.3`.
