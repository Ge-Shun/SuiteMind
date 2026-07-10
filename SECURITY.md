# Security Policy

## Reporting A Vulnerability

Do not open a public GitHub issue for a vulnerability that could expose API
keys, document content, authentication tokens, or private deployment details.
Contact the repository owner privately through the security reporting options
available on GitHub.

Include the affected version, reproduction steps, expected impact, and any
suggested mitigation. Do not include real document content or production API
credentials in the report.

## Deployment Responsibilities

- Keep model provider credentials on the API server.
- Use HTTPS for the API and task pane.
- Configure exact CORS origins.
- Enable authentication before exposing the API publicly.
- Use a shared external limiter for multi-instance deployments.
- Do not enable the mock provider accidentally in production.
- Review logging and observability systems for document-content leakage.

SuiteMind does not intentionally log request bodies or selected document text.
