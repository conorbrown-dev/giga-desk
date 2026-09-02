# Praxis Web Template

A policy-first GitHub repository template for a full-stack TypeScript application with:

- a NestJS, Prisma, PostgreSQL, CQRS backend organized with Clean Architecture and domain-driven design; and
- a Vite, React, Tailwind CSS, Formik/Yup, and React Router frontend.

## Using the template

1. Select **Use this template** on GitHub and create a new repository.
2. Choose a workspace layout that keeps the frontend and backend separate (the recommended paths are `apps/web` and `apps/api`).
3. Scaffold the applications with their current official tooling.
4. Enable strict TypeScript and add scripts for typechecking, linting, unit tests, backend integration tests, frontend E2E tests, and production builds.
5. Replace the initial entry in `progress.md` with the new project's first verified state.
6. Read and follow `AGENTS.md` before changing product code.

This template intentionally does not pin framework versions or generated scaffolding. New repositories can start with supported versions while retaining the architectural, testing, accessibility, and delivery rules in `AGENTS.md`.

## Suggested layout

```text
apps/
  api/       # NestJS application
  web/       # Vite React application
packages/    # Deliberately shared code, when a stable need exists
AGENTS.md
progress.md
```

## Delivery rules at a glance

- One feature per push, with commits organized by that feature.
- No more than 228 changed lines of product code per push; docs, tests, and configuration are excluded.
- Unit and integration tests for every backend product-code change.
- Unit/component and E2E tests for every frontend product-code change.
- Update `progress.md` for every change and reconcile it with the codebase before starting.

## Local showcase

With Docker running, launch the database, API, and web demo with:

```bash
npm run demo
```

Open `http://127.0.0.1:5173` and sign in with the local-only account `demo` / `giga-desk-demo`. The launcher starts an isolated Keycloak realm and database, so the browser uses authorization code flow with PKCE and the API verifies a real Keycloak access token. These development credentials must not be used in production.

## Polling agent simulator

The development-only simulator consumes the machine API without importing API implementation code. Register an execution node, queue work for it, and provide that node's scoped short-lived token:

Provision the Codex target after building the API. The command idempotently creates or updates the node, Codex CLI agent version, and remote default-model selection, then prints their non-secret registry IDs:

```bash
DATABASE_URL=<postgresql-url> npm run target:codex -w @giga-desk/api -- \
  MIRIAM Conor-Ubuntu-MIRIAM Linux x64 0.152.0
```

The node remains offline until its scoped machine identity begins sending heartbeats.

```bash
npm run build
GIGA_DESK_AGENT_NODE_ID=<node-uuid> \
GIGA_DESK_AGENT_TOKEN=<machine-token> \
npm run agent:simulate
```

It polls `http://127.0.0.1:3000` every five seconds, claims one queued job at a time, retrieves its Work Package, and reports simulated progress, passing tests, a successful staging deployment, E2E evidence, and completion. Set `GIGA_DESK_AGENT_API_URL`, `GIGA_DESK_AGENT_POLL_INTERVAL_MS`, or `GIGA_DESK_AGENT_ONCE=true` to override those defaults. Do not use the simulator against production because its evidence is synthetic.
