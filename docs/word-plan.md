# SuiteMind Word Plan

## Product Goal

Build a dependable Word task-pane assistant that answers questions about
selected text and proposes reviewable edits. SuiteMind is not an autonomous
document agent: it reads explicit context and writes only after confirmation.

## Product Architecture

```text
Microsoft Word
  -> Office.js adapter
  -> SuiteMind static task pane
  -> user's selected AI provider
```

SuiteMind is distributed through GitHub Pages or another static HTTPS host.
Users bring their own API key. No SuiteMind model relay is part of the current
product.

## User Flows

### Ask

1. Select text or place the cursor in a paragraph.
2. Enter a question.
3. Stream an answer using the document text as context.
4. Copy the answer, insert it below the source, regenerate, or discard it.

Ask results do not offer source replacement by default.

### Edit

1. Select text or place the cursor in a paragraph.
2. Choose polish, rewrite, translate, summarize, continue, or custom edit.
3. Optionally enter extra constraints; custom edit requires an instruction.
4. Review Diff, Before, and After.
5. Replace the tracked source, insert below, regenerate, or discard.

## AI Boundary

- `ask` returns an answer based on the selected document context.
- `rewrite` returns fresh wording while preserving meaning and key details.
- `custom` applies an explicit editing instruction.
- All provider output is treated as text, never executable Office.js.
- Provider keys are stored persistently on the user's device until cleared.

## Word Safety

- Read only the current selection or non-empty cursor paragraph.
- Track the original Word range or paragraph while generation is running.
- Fingerprint the source text before and after generation.
- Block writes when the source changes or the tracked object expires.
- Require explicit confirmation before replace or insert.
- Use Word-native writes so Undo remains available.

## Current Scope

Included:

- Word task pane and Office.js integration.
- Ask, polish, rewrite, translate, summarize, continue, and custom edit.
- OpenAI-compatible, DeepSeek, Claude, and Gemini direct providers.
- Persistent runtime provider settings and explicit Key clearing.
- Streaming generation, cancellation, review, copy, replace, and insert.
- Chinese and English UI.
- GitHub Pages deployment and production manifest generation.

Deferred:

- Excel and PowerPoint.
- Whole-document autonomous editing.
- Accounts, billing, team administration, and cloud document storage.
- Guaranteed preservation of mixed inline formatting.
- Images, equations, citations, comments, and tracked changes.
- A hosted CORS relay or shared SuiteMind model key.

## Testing Strategy

- Contract tests for operation validation.
- Provider streaming and prompt tests.
- Component tests for language, model settings, and validation states.
- Mock Office tests for replacement, insertion, stale content, and release.
- Browser tests for responsive task-pane behavior.
- Manual Word tests for selection tracking, style inheritance, and Undo.

## Beta Acceptance Criteria

- Every supported provider can be configured and cleared.
- Ask returns an answer without presenting replacement as the primary action.
- Rewrite and other edit operations produce reviewable text changes.
- No document content changes before confirmation.
- Stale content cannot be overwritten silently.
- The API key persists across add-in sessions and can be explicitly cleared.
- Production documentation explains the local-storage and CORS trust boundary.
- Core workflows pass in Word for Windows and Word on the web.
