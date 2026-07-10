# SuiteMind Word Plan

## 1. Product Goal

Build a Word task-pane add-in that lets a user apply AI to selected document
content without leaving Word. The first release should feel like a dependable
editing tool, not an autonomous agent: SuiteMind reads explicit context,
generates a proposed result, and writes only after user confirmation.

## 2. Target User Flow

```text
Select text in Word
        |
Open SuiteMind and choose an action
        |
Read selection and validate size
        |
Send request to the SuiteMind API
        |
Stream result into a preview
        |
Review result
        |
Replace selection / Insert below / Discard
```

The add-in should also support a custom instruction field. Actions are prompt
presets, not separate implementations.

## 3. MVP Scope

### Included

- Word task pane with a compact action toolbar.
- Read the current text selection, or the paragraph at the cursor, through
  Office.js.
- Built-in actions: polish, rewrite, translate, summarize, and continue writing.
- Custom instructions.
- Target language selection for translation.
- Streaming generation with cancel and retry controls.
- Before/after preview with a text-level diff.
- Apply modes: replace selection and insert below selection.
- Clear empty-context, oversized-input, network, and provider errors.
- Settings for the SuiteMind API endpoint in development.
- Server-side model provider configuration through environment variables.
- Word-native undo after an edit is applied.

### Excluded From MVP

- Autonomous whole-document editing.
- Excel or PowerPoint support.
- Images, charts, equations, footnotes, citations, and tracked-change generation.
- Reliable preservation of mixed inline formatting across rewritten text.
- Multi-user accounts, billing, team administration, and cloud document storage.
- Arbitrary model-generated Office.js or JavaScript execution.

These exclusions keep the first release small enough to validate the core user
experience and avoid unsafe or fragile document mutations.

## 4. Interaction Design

The task pane has four stable states:

1. **Ready**: action controls and custom instruction are available.
2. **Generating**: streamed output is visible with a cancel control.
3. **Review**: before/after content and apply actions are visible.
4. **Result**: success or actionable error feedback is shown.

The primary command in the review state is **Replace selection**. Secondary
commands are **Insert below**, **Retry**, and **Discard**. The add-in tracks the
original Word range while generation is running and fingerprints its content
again before applying a result. If the source content changes or the tracked
range expires, the add-in must block the write and ask the user to generate
again rather than writing to an uncertain location.

Recommended MVP input limit: 10,000 characters per request. This should be
configurable on the server.

## 5. Technical Architecture

```text
Microsoft Word
  Office.js Word API
        |
Word add-in (React + TypeScript)
  selection reader
  request state machine
  streaming preview
  diff viewer
  controlled writer
        |
        | HTTPS + server-sent events
        v
SuiteMind API (Node.js + TypeScript)
  request validation
  prompt builder
  provider-neutral AI service
  rate and size limits
        |
        v
Configured AI provider
```

### Frontend

- React and TypeScript for the task pane.
- Office.js `Word.run` APIs for reading and writing the active selection.
- A small explicit request state machine to prevent double submits and stale
  writes.
- Text diff rendering in the task pane; no document mutation during preview.
- HTTPS local development using Office add-in development certificates.

### Backend

- Node.js and TypeScript.
- A small HTTP framework with server-sent event support.
- Zod schemas shared through `packages/contracts`.
- Provider adapters behind one internal interface.
- API keys loaded from server environment variables.
- No document text logging by default.

### AI Boundary

For the MVP, the model returns text only. It does not return executable code or
direct Office commands. Document operations are selected by the user and
implemented by trusted add-in code.

Later structured operations should use a strict allowlist such as:

```json
{
  "operation": "replace_selection",
  "content": "Validated model output"
}
```

## 6. Initial API Contract

Request:

```http
POST /v1/transform
Content-Type: application/json
Accept: text/event-stream
```

```json
{
  "operation": "polish",
  "text": "Selected document text",
  "instruction": "Make it concise and professional",
  "targetLanguage": null,
  "documentLanguage": "en"
}
```

Stream events:

```text
event: delta
data: {"text":"partial output"}

event: done
data: {"requestId":"...","usage":{"inputTokens":0,"outputTokens":0}}

event: error
data: {"code":"PROVIDER_ERROR","message":"Generation failed"}
```

The server validates operation names, input size, optional fields, and provider
output before opening or completing the stream.

## 7. Suggested Repository Structure

```text
apps/
|-- word-addin/
|   |-- manifest.xml
|   `-- src/
|       |-- office/       # Word API boundary
|       |-- features/     # transform and review flows
|       |-- components/
|       `-- services/     # SuiteMind API client
`-- api/
    `-- src/
        |-- routes/
        |-- providers/
        |-- prompts/
        `-- config/
packages/
|-- contracts/
`-- ai-core/
```

Office-specific code must stay behind `apps/word-addin/src/office`. This keeps
the UI and AI contracts reusable without prematurely implementing Excel or
PowerPoint.

## 8. Delivery Milestones

### M0: Development Foundation (Complete)

- npm workspace and TypeScript configuration.
- Word add-in manifest and HTTPS development server.
- Task pane loads in Word desktop and Word on the web.
- API health endpoint and local environment template.

### M1: Word Read/Write Spike (Complete)

- Read the current selection.
- Display it in the task pane.
- Replace or insert deterministic test text.
- Confirm native undo works.

This milestone proves the Office integration before adding AI complexity.

### M2: AI Transformation (Complete)

- Provider-neutral backend interface.
- First provider implementation.
- Transform endpoint with validation and request limits.
- Streaming output, cancellation, and provider error handling.

### M3: Reviewable Editing MVP (Complete)

- Action presets and custom instruction.
- Before/after diff.
- Replace, insert, retry, and discard flows.
- Stale-selection protection.
- Polished empty, loading, success, and error states.

### M4: Beta Hardening (In Progress)

- Unit and integration tests.
- Manual compatibility pass on Windows desktop and Word on the web.
- Privacy documentation and disabled-by-default content logging.
- Packaging and sideloading documentation.

## 9. Testing Strategy

- Unit tests for schemas, prompt construction, provider adapters, and state
  transitions.
- Component tests for ready, generating, review, and error states.
- Mocked Office.js tests for selection and apply behavior.
- API integration tests with a fake streaming provider.
- Manual host tests for desktop Word and Word on the web.
- Regression fixtures for Chinese, English, mixed-language, long, and empty text.

Browser tests can cover the task pane UI in isolation, but they do not replace
manual checks inside the Word host.

## 10. MVP Acceptance Criteria

The Word MVP is ready for an internal beta when:

- A user can select text and run every built-in action.
- Output streams into the task pane and can be cancelled.
- No document content changes before explicit confirmation.
- Replace and insert modes work and remain undoable.
- A changed or stale selection cannot be overwritten silently.
- Model credentials are absent from frontend bundles and source control.
- Empty, oversized, offline, timeout, and provider failures have clear recovery
  paths.
- The core workflow passes on Word for Windows and Word on the web.

## 11. Decisions Deferred Until Implementation

- First supported AI provider and default model.
- Authentication strategy for a hosted release.
- Whether macOS is required for the first internal beta.
- Product telemetry and opt-in diagnostics.
- Formatting-preserving rewrites using OOXML or content controls.
