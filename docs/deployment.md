# SuiteMind Deployment

SuiteMind is deployed as a static BYOK Word add-in. No SuiteMind API server is
required. Each user supplies a model provider API key in the task pane.

## GitHub Pages

The repository includes `.github/workflows/deploy-word-addin-pages.yml`. On a
push to `main`, it tests, type-checks, builds, generates the production Office
manifest, and deploys `apps/word-addin/dist/` to GitHub Pages.

Production deployment requires a dedicated custom domain so the add-in does not
share browser storage with other `github.io` project sites. Use a hostname that
serves only SuiteMind, for example:

```text
word.example.com
```

Configure deployment:

1. Add a DNS `CNAME` record from the hostname to
   `<github-user-or-org>.github.io`.
2. In **Settings -> Secrets and variables -> Actions -> Variables**, create
   `SUITEMIND_ADDIN_DOMAIN` with the hostname only, without `https://` or a path.
3. Enable Pages under **Settings -> Pages -> GitHub Actions**.
4. In **Settings -> Pages -> Custom domain**, enter the same hostname and enable
   **Enforce HTTPS** after GitHub verifies the DNS record.
5. Run the deployment workflow or push to `main`.

The workflow writes the Pages `CNAME` file, builds for the domain root, and
generates a production manifest pointing to
`https://<SUITEMIND_ADDIN_DOMAIN>/taskpane.html`. Deployment fails when the
repository variable is missing, and manifest generation rejects `github.io`
origins.

## Manual Static Deployment

```powershell
npm ci
npm run build -w @suitemind/word-addin
```

Deploy `apps/word-addin/dist/` to any trusted static HTTPS host.

Use a dedicated origin that does not host unrelated applications. The manifest
generator rejects `github.io` project-site origins because they share local
storage across all project paths owned by the same account.

Generate the production manifest:

```powershell
$env:SUITEMIND_ADDIN_URL="https://addin.example.com"
$env:SUITEMIND_ADDIN_ORIGIN="https://addin.example.com"
$env:SUITEMIND_SUPPORT_URL="https://github.com/Ge-Shun/SuiteMind"
npm run generate:production-manifest
```

Validate it:

```powershell
npx office-addin-manifest validate apps/word-addin/dist/manifest.xml
```

## Provider Configuration

Users configure one provider after installing the add-in:

| Provider          | Default API base URL                               | Request format                          |
| ----------------- | -------------------------------------------------- | --------------------------------------- |
| OpenAI-compatible | `https://api.openai.com/v1`                        | Bearer auth and `/chat/completions` SSE |
| DeepSeek          | `https://api.deepseek.com`                         | Bearer auth and `/chat/completions` SSE |
| Claude            | `https://api.anthropic.com`                        | Anthropic Messages SSE                  |
| Gemini            | `https://generativelanguage.googleapis.com/v1beta` | Gemini streaming content SSE            |

The API key is stored persistently in local storage on the current device until
the user clears it. It is sent directly to the selected provider or through the
temporary localhost proxy when direct browser access is blocked.

## CORS Limitation

The add-in first calls OpenAI-compatible providers directly. If the browser or
Office WebView blocks the request, it automatically retries through the local
HTTPS proxy at `https://localhost:3001`. The user must run `npm run proxy:local`
on the same computer while generating, after running `npm run proxy:certs` once
to install the trusted localhost certificate. Before starting the proxy for a
deployed add-in, set `SUITEMIND_PROXY_ALLOWED_ORIGINS` to the add-in's exact
HTTPS origin, for example `https://word.example.com`. Claude and Gemini keep
their provider-specific direct browser integrations.

## Release Checks

```powershell
npm run format:check
npm run typecheck
npm test
npm run build
npm run validate:manifest -w @suitemind/word-addin
```

Also validate in real Word:

- provider authentication and CORS;
- question answers, copy, and insert-below;
- rewrite, polish, translate, summarize, continue, and custom edit;
- tracked replacement and stale-source rejection;
- paragraph style inheritance and native Undo;
- Chinese, English, and mixed-language text.
