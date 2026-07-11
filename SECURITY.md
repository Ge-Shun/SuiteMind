# Security Policy

## Reporting A Vulnerability

Do not open a public issue for a vulnerability that could expose API keys,
document content, or private deployment information. Contact the repository
owner privately through GitHub security reporting.

Include the affected version, reproduction steps, expected impact, and a
suggested mitigation. Never include a real provider key or private document.

## Credential Model

SuiteMind is a static BYOK add-in. The user enters a provider API key, which is:

- kept only in the current task pane's memory and removed on reload or close;
- sent directly to the selected model provider over HTTPS, or through the
  temporary localhost proxy when direct browser access is blocked;
- never sent to a SuiteMind relay server;
- never included in source control or build-time environment variables.

Provider choice, API URL, and model may be stored in local storage, but the API
key is deliberately excluded. Loading a legacy settings record removes any key
that an earlier version persisted. GitHub Project Pages share an origin across
repositories owned by the same account, so they remain a weaker isolation
boundary than a dedicated domain; keeping the key only in memory prevents
passive recovery from persistent browser storage. Users should still close the
task pane on shared devices and avoid running untrusted pages under the same
GitHub Pages origin while entering a key.

## Deployment Responsibilities

- Serve the task pane only from HTTPS.
- Prefer a dedicated origin for stronger browser isolation when one is available.
- Protect the repository and GitHub Pages deployment workflow.
- Review dependency updates and avoid untrusted third-party scripts.
- Keep production source maps disabled.
- Do not log provider request headers or document content.
- Explain when users must run the temporary local provider proxy.
- Treat model output as text and require confirmation before Word writes.

The local proxy listens on `localhost`, accepts only HTTPS OpenAI-compatible
`/chat/completions` targets, allows only explicitly configured HTTPS origins,
and keeps request data in memory only. It must not log authorization headers,
document content, or provider responses.

## Document Safety

- Only the current selection or paragraph is read.
- The original Word object is tracked during generation.
- The source text is fingerprinted again before writing.
- A stale or expired source blocks replacement.
- Users can discard results or use native Word Undo after applying them.
