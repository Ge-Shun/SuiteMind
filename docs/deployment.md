# SuiteMind Deployment

SuiteMind is deployed as a static BYOK Word add-in. No SuiteMind API server is
required. Each user supplies a model provider API key in the task pane.

## GitHub Pages

The repository includes `.github/workflows/deploy-word-addin-pages.yml`. On a
push to `main`, it tests, type-checks, builds, generates the production Office
manifest, and deploys `apps/word-addin/dist/` to GitHub Pages.

The default workflow deploys to the repository's free GitHub Project Pages URL:

```text
https://ge-shun.github.io/SuiteMind/
```

In **Settings -> Pages**, select **GitHub Actions** as the deployment source,
then run the workflow or push to `main`. No custom domain or repository variable
is required. The workflow builds with the `/SuiteMind/` base path and generates
a production manifest pointing to the deployed task pane.

GitHub Project Pages for one account share the `https://ge-shun.github.io`
origin. SuiteMind therefore keeps the API key only in task pane memory and never
writes it to local storage. A dedicated custom domain still provides stronger
browser isolation and can be added later without changing the credential model.

## Manual Static Deployment

```powershell
npm ci
npm run build -w @suitemind/word-addin
```

Deploy `apps/word-addin/dist/` to any trusted static HTTPS host. A dedicated
origin is preferred when available, but the manifest generator also supports
GitHub Project Pages.

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

| Provider          | Default API base URL                               | Request format                 |
| ----------------- | -------------------------------------------------- | ------------------------------ |
| OpenAI            | `https://api.openai.com/v1`                        | Responses API `/responses` SSE |
| OpenAI-compatible | User supplied                                      | `/chat/completions` SSE        |
| DeepSeek          | `https://api.deepseek.com`                         | `/chat/completions` SSE        |
| Claude            | `https://api.anthropic.com`                        | Anthropic Messages SSE         |
| Gemini            | `https://generativelanguage.googleapis.com/v1beta` | Gemini streaming content SSE   |

The API key stays only in the current task pane's memory and is removed when the
pane reloads or closes. It is sent directly to the selected provider or through
the temporary localhost proxy when direct browser access is blocked. Other
provider settings may persist without the key.

## CORS Limitation

The add-in uses OpenAI Responses by default, while OpenAI-compatible and
DeepSeek providers use Chat Completions for compatibility. If the browser or
Office WebView blocks an OpenAI-family request, the add-in automatically retries
through the local HTTPS proxy at `https://localhost:3001`. The user must run
`npm run proxy:local` on the same computer while generating, after running
`npm run proxy:certs` once to install the trusted localhost certificate. Before
starting the proxy for a GitHub Pages deployment, set
`SUITEMIND_PROXY_ALLOWED_ORIGINS` to `https://ge-shun.github.io`. Claude and
Gemini keep their provider-specific direct browser integrations.

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
