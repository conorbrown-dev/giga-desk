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
