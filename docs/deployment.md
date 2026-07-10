# SuiteMind Deployment

SuiteMind can be distributed in two modes:

1. **Static-only BYOK add-in (no SuiteMind relay backend).** Users enter their own
   Claude, DeepSeek, Gemini, or OpenAI-compatible API settings in the Word add-in.
2. **Hosted SuiteMind API + add-in.** You run `apps/api` and the add-in calls your
   API.

This project now supports mode 1 without adding a relay backend. The add-in page
still must be hosted on a public HTTPS origin because Office add-ins cannot be
loaded by normal users from `localhost`.

## 1. Static-only BYOK deployment, no relay backend

Use this when every user brings their own model API key and you do **not** want
to operate a SuiteMind relay service.

### 1.1 Build the Word task pane

```powershell
npm ci
npm run build -w @suitemind/word-addin
```

Deploy everything in `apps/word-addin/dist/` to a static HTTPS host such as
Cloudflare Pages, Vercel, Netlify, Azure Static Web Apps, an S3/CloudFront site,
or any CDN/static web server that serves HTTPS.

Confirm these URLs are public and return the expected files:

```text
https://addin.example.com/taskpane.html
https://addin.example.com/assets/icon-32.png
https://addin.example.com/assets/icon-80.png
```

For the static-only BYOK mode, `VITE_API_BASE_URL` and `VITE_API_TOKEN` are not
required for direct Claude, DeepSeek, Gemini, or OpenAI-compatible calls. The
built bundle can still show the `SuiteMind API` option, but direct provider modes
work from the user-entered settings stored in the add-in.

### 1.2 Generate the production manifest

```powershell
$env:SUITEMIND_ADDIN_URL="https://addin.example.com"
$env:SUITEMIND_ADDIN_ORIGIN="https://addin.example.com"
$env:SUITEMIND_SUPPORT_URL="https://github.com/Ge-Shun/SuiteMind"
npm run generate:production-manifest
```

The generated file is:

```text
apps/word-addin/dist/manifest.xml
```

Validate it before distribution:

```powershell
npx office-addin-manifest validate apps/word-addin/dist/manifest.xml
```

The generator rejects non-HTTPS URLs and unresolved placeholders. `SUITEMIND_ADDIN_ORIGIN` can differ from `SUITEMIND_ADDIN_URL` for GitHub Project Pages, where the add-in lives under a repository path but the Office `AppDomain` should remain the site origin.

### 1.3 User setup after installation

In Word, users open the add-in settings and choose one provider:

| Provider option   | Default API base URL                               | Request format                                                    |
| ----------------- | -------------------------------------------------- | ----------------------------------------------------------------- |
| OpenAI-compatible | `https://api.openai.com/v1`                        | `POST /chat/completions` with Bearer auth and SSE                 |
| DeepSeek          | `https://api.deepseek.com`                         | `POST /chat/completions` with Bearer auth and SSE                 |
| Claude            | `https://api.anthropic.com`                        | `POST /v1/messages` with Anthropic browser-access headers and SSE |
| Gemini            | `https://generativelanguage.googleapis.com/v1beta` | `POST /models/{model}:streamGenerateContent?alt=sse&key=...`      |

The API key is saved in the add-in's local storage on the user's device and is
sent directly from the Office task pane to the selected provider.

### 1.4 Important limitations without a relay backend

Because there is no relay backend, every selected provider must allow browser /
Office WebView requests from your add-in origin with CORS. If a provider blocks
browser CORS, the user can enter a valid API key and still see `Failed to fetch`
or a CORS error. In that case, the only reliable fix is either choosing a
provider/API gateway that supports browser CORS or adding a relay backend later.

Do not promise that every vendor endpoint will work in every Office WebView. Test
each target provider with the production HTTPS origin before publishing broadly.

## 2. Free GitHub Pages deployment

GitHub Pages is the best zero-cost option for the static-only BYOK add-in when
the repository is public. GitHub Actions is also free for public repositories;
private repositories can require a paid plan or consume included Actions minutes.

This repository includes `.github/workflows/deploy-word-addin-pages.yml`, which
uses Node.js 24, builds the Word add-in, generates `dist/manifest.xml`, and deploys
`apps/word-addin/dist/` to GitHub Pages. The workflow is configured for GitHub
Project Pages at:

```text
https://<github-user-or-org>.github.io/<repository-name>/
```

The workflow sets `VITE_ADDIN_BASE_PATH` to `/<repository-name>/` so Vite emits
asset URLs that work under the GitHub Pages project subpath. It also generates
the Office manifest with:

```text
SourceLocation = https://<github-user-or-org>.github.io/<repository-name>/taskpane.html
AppDomain      = https://<github-user-or-org>.github.io
```

To enable it in GitHub:

1. Push this repository to GitHub.
2. Open **Settings → Pages**.
3. Set **Build and deployment → Source** to **GitHub Actions** when the dropdown is available. The workflow also passes `enablement: true` to `actions/configure-pages` so a first run can create/enable the Pages site automatically.
4. Run **Actions → Deploy Word Add-in to GitHub Pages → Run workflow**, or push
   to `main`.
5. Download `manifest.xml` from the deployed site or from the workflow artifact
   output path `apps/word-addin/dist/manifest.xml`.

If you use a custom domain such as `https://addin.example.com`, update the
workflow env values to:

```yaml
VITE_ADDIN_BASE_PATH: /
SUITEMIND_ADDIN_URL: https://addin.example.com
SUITEMIND_ADDIN_ORIGIN: https://addin.example.com
```

## 3. Optional hosted SuiteMind API deployment

Use this mode only if you decide to operate your own SuiteMind API service.

Build and verify the server:

```powershell
npm ci
npm run build -w @suitemind/api
```

Set production environment variables:

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=8787
CORS_ORIGINS=https://addin.example.com
AI_PROVIDER=openai-compatible
AI_BASE_URL=https://provider.example/v1
AI_API_KEY=server-side-provider-key
AI_MODEL=model-id
API_BEARER_TOKEN=at-least-16-random-characters
MAX_INPUT_CHARS=10000
MAX_OUTPUT_CHARS=20000
REQUEST_TIMEOUT_MS=60000
RATE_LIMIT_MAX=30
RATE_LIMIT_WINDOW_MS=60000
MAX_CONCURRENT_REQUESTS=4
TRUST_PROXY=true
```

Start the compiled server:

```powershell
npm run start -w @suitemind/api
```

The mock provider is rejected automatically when `NODE_ENV=production` unless
`ALLOW_MOCK_PROVIDER=true` is explicitly set.

The built-in limiter is process-local. A multi-instance deployment should use an
external shared rate-limit store or enforce limits at the API gateway.

When building the add-in for a hosted SuiteMind API, set the public API URL:

```powershell
$env:VITE_API_BASE_URL="https://api.example.com"
npm run build -w @suitemind/word-addin
```

`VITE_API_TOKEN` is suitable only for a private single-user deployment because
all Vite variables are visible in the browser bundle. A public multi-user
deployment should issue short-lived user sessions through a trusted backend or
reverse proxy instead of embedding a shared secret.

## 4. Release checks

```powershell
npm run format:check
npm run typecheck
npm test
npm run build
npm run validate:manifest -w @suitemind/word-addin
```

After automated checks, sideload the production manifest in Word and verify:

- task pane loading from the public HTTPS origin;
- provider settings for Claude, DeepSeek, Gemini, and OpenAI-compatible APIs;
- selection read and tracked-range replacement;
- insert-below paragraph styling;
- native Word undo;
- provider authentication, CORS, quota, and rate-limit errors;
- Chinese, English, and mixed-language selections.
