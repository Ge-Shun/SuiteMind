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

The deployment also publishes the end-user installation page and manifest:

```text
https://ge-shun.github.io/SuiteMind/install.html
https://ge-shun.github.io/SuiteMind/manifest.xml
```

Share the installation page with users. Do not share the development manifest,
which points to localhost. Detailed user instructions live in
[`installation.md`](installation.md).

## Connector Code Signing

The Pages and Release workflows support Authenticode signing through SignPath
before the Windows connector ZIP is created. Signing is currently disabled, so
published connector builds are unsigned and include SHA-256 checksum files.

For an individual maintainer, the free open-source certificate displays
**SignPath Foundation** as the Windows publisher. Displaying the maintainer's
personal legal name instead requires a paid, identity-validated individual code
signing certificate and a compatible cloud or hardware signing service.

To enable SignPath signing:

1. Obtain an approved SignPath Foundation project or a regular paid SignPath
   subscription, then connect this GitHub repository as a trusted build system.
2. Create a SignPath project for `SuiteMind`, an artifact configuration whose
   root is a Windows PE file, and a release signing policy that uses SHA-256
   Authenticode signing with an RFC 3161 timestamp.
3. Add `SIGNPATH_API_TOKEN` as a GitHub Actions repository secret.
4. Add these GitHub Actions repository variables with the values shown in
   SignPath:
   - `SIGNPATH_ORGANIZATION_ID`
   - `SIGNPATH_PROJECT_SLUG`
   - `SIGNPATH_SIGNING_POLICY_SLUG`
   - `SIGNPATH_ARTIFACT_CONFIGURATION_SLUG`
5. Set the repository variable `SIGNPATH_ENABLED` to `true` and run the Pages
   workflow.

When signing is enabled, deployment fails unless the executable has a valid
trusted Authenticode signature and an RFC 3161 timestamp. When it is not
enabled, the workflow remains usable but emits a warning and publishes an
unsigned connector with a SHA-256 checksum. Never commit a certificate, private
key, API token, or PFX file to the repository.

Verify a signed local executable and create the distribution ZIP with:

```powershell
.\scripts\package-connector.ps1 -RequireSignature
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

## GitHub Releases

`.github/workflows/release.yml` publishes a GitHub Release when a semantic
version tag such as `v0.1.0` is pushed. The tag without its leading `v` must
match the root `package.json` version. The workflow:

1. Builds a self-contained Windows connector with matching file metadata.
2. Uses SignPath when `SIGNPATH_ENABLED=true`, otherwise marks the release as
   unsigned.
3. Creates a versioned ZIP and SHA-256 checksum.
4. Generates the production Office manifest.
5. Verifies all assets and creates `SHA256SUMS.txt`.
6. Publishes a GitHub Release with generated changes and an explicit signing
   status notice.

To publish a version, update and test the version on `main`, then create the tag:

```powershell
npm version 0.1.1 --no-git-tag-version
npm run format:check
npm run typecheck
npm test
npm run build
git add package.json package-lock.json
git commit -m "chore: prepare v0.1.1"
git tag v0.1.1
git push origin main
git push origin v0.1.1
```

Do not move or reuse a published version tag. Correct a failed release in a new
patch version after fixing the workflow or source.

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
through SuiteMind Connector at `https://localhost:3001`. Windows users download
the connector from the production installation page and run it as a tray
application. It creates its current-user localhost certificate on first launch.

Developers can instead run `npm run proxy:local` after installing development
certificates with `npm run proxy:certs`. Before starting the Node.js proxy for a
GitHub Pages deployment, set `SUITEMIND_PROXY_ALLOWED_ORIGINS` to
`https://ge-shun.github.io`. Claude and Gemini keep their provider-specific
direct browser integrations.

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
