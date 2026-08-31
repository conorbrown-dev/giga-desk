# Progress

## Current state

- Repository template initialized with contributor, architecture, testing, and delivery guidance.
- Contributor guidance requires GitHub, Railway, and Cloudflare CLI tooling for repository, deployment, and infrastructure operations.
- No frontend or backend application has been scaffolded.

## Verification

- Documentation reviewed for consistency with the template's requested stack and workflow.
- No product code exists, so build and test commands are not yet applicable.

## Next steps

- Create a repository from this template.
- Scaffold `apps/web` and `apps/api` using supported framework versions.
- Add repository scripts and CI for typechecking, linting, unit tests, backend integration tests, frontend E2E tests, and production builds.

## Change log

### Platform CLI requirements

- Required the GitHub CLI for repository management, the Railway CLI for deployment and deployment troubleshooting, and the Cloudflare CLI for DNS, SSL, and tunnel management.
- Required installation from an official source when a necessary CLI is unavailable, plus authentication and target verification before remote changes.

### Initial template

- Added `AGENTS.md` with full-stack architecture, test, accessibility, code-quality, and push-scope rules.
- Added repository usage guidance and a pull-request checklist.
