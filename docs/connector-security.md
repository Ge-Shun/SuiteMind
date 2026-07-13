# SuiteMind Connector Security

SuiteMind Connector is an optional Windows tray application for provider APIs
that block direct requests from Office webviews.

## Local Boundary

- Listens only on `localhost` port `3001` over HTTPS.
- Creates a two-year localhost certificate and trusts it only for the current
  Windows user.
- Accepts browser requests only from `https://ge-shun.github.io` and explicit
  localhost development origins.
- Exposes a health endpoint and one provider forwarding endpoint.

## Provider Boundary

- Requires HTTPS provider targets.
- Allows only paths ending in `/responses` or `/chat/completions`.
- Rejects localhost, loopback, link-local, and private-network target addresses.
- Forwards only `Accept`, `Authorization`, and `Content-Type` headers.
- Limits request bodies to 2 MiB.
- Streams provider responses without storing them.

## Credential Handling

The connector receives the provider API key only in the in-memory HTTP request
header. It does not write API keys, Word content, request bodies, or model
responses to disk or application logs.

## Windows Integration

- Copies the executable to the current user's local application data directory
  on first launch.
- Registers the `suitemind://` protocol for the current user.
- Registers itself in the current user's Windows Run key by default. The user can
  disable **Start with Windows** from the tray menu.
- Does not require a Windows service or system-wide installation.
