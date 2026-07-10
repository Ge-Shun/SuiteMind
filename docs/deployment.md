# SuiteMind Deployment

SuiteMind has two deployable parts:

1. The Node.js AI API.
2. The static Word task pane and its production Office manifest.

Both public endpoints must use HTTPS.

## 1. Deploy The API

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

The built-in limiter is process-local. A multi-instance deployment should use
an external shared rate-limit store or enforce limits at the API gateway.

## 2. Build The Task Pane

The public API URL must be HTTPS:

```powershell
$env:VITE_API_BASE_URL="https://api.example.com"
npm run build -w @suitemind/word-addin
```

Deploy everything in `apps/word-addin/dist/` to the add-in host. Confirm these
URLs are public and return the correct content:

```text
https://addin.example.com/taskpane.html
https://addin.example.com/assets/icon-32.png
https://addin.example.com/assets/icon-80.png
```

`VITE_API_TOKEN` is suitable only for a private single-user deployment because
all Vite variables are visible in the browser bundle. A public multi-user
deployment should issue short-lived user sessions through a trusted backend or
reverse proxy instead of embedding a shared secret.

## 3. Generate The Production Manifest

```powershell
$env:SUITEMIND_ADDIN_URL="https://addin.example.com"
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

The generator rejects non-HTTPS URLs and unresolved placeholders.

## 4. Release Checks

```powershell
npm run format:check
npm run typecheck
npm test
npm run build
npm run validate:manifest -w @suitemind/word-addin
```

After automated checks, sideload the production manifest in Word and verify:

- task pane loading;
- selection read and tracked-range replacement;
- insert-below paragraph styling;
- native Word undo;
- authentication and rate-limit errors;
- Chinese, English, and mixed-language selections.
