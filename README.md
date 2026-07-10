# SuiteMind

SuiteMind is an AI workspace for Microsoft Office. The current release focuses
on Microsoft Word and provides controlled, reviewable AI-assisted editing
inside the document.

## Current Focus

The Word MVP will support this workflow:

1. Read the current Word selection, or the paragraph at the cursor.
2. Send the text and an operation to the SuiteMind API.
3. Stream the generated result into the task pane.
4. Preview the change before modifying the document.
5. Replace the tracked source or insert the result below it.

Initial operations:

- Polish
- Rewrite
- Translate
- Summarize
- Continue writing
- Custom instruction

Excel and PowerPoint are intentionally out of scope until the Word workflow is
stable.

## Product Principles

- User-controlled writes: AI output is previewed before it changes a document.
- Provider-neutral API: the add-in is not coupled to one model vendor.
- Secure credentials: model API keys stay on the server, never in the add-in.
- Minimal document access: read only the content required for the current task.
- Reversible changes: use Word-native editing so users can undo applied changes.

## Repository Layout

```text
SuiteMind/
|-- apps/
|   |-- word-addin/       # Word task pane and Office.js integration
|   `-- api/              # AI gateway and streaming API
|-- packages/
|   `-- contracts/        # Shared request, response, and event schemas
|-- docs/
|   `-- word-plan.md
|-- package.json
`-- README.md
```

See [docs/word-plan.md](docs/word-plan.md) for the product plan and
[docs/development.md](docs/development.md) for setup, configuration, and Word
sideloading. Production hosting and manifest generation are covered in
[docs/deployment.md](docs/deployment.md).

## Status

The Word MVP is implemented with:

- An Office.js Word adapter with tracked-range and stale-content protection.
- A browser mock adapter for development without launching Word.
- Streaming AI output over server-sent events.
- Diff, before, and after review modes.
- Replace and insert-below actions.
- Mock and OpenAI-compatible server-side providers.
- Optional API authentication, rate limiting, and output-size limits.
- Unit tests, production builds, and a validated Office manifest.

Excel and PowerPoint remain out of scope for this release.

## Quick Start

```powershell
npm install
npm run dev
```

Open the browser development view at:

```text
https://localhost:3000/taskpane.html?mockOffice=1
```

To sideload into Word desktop:

```powershell
npm run sideload:word
```
