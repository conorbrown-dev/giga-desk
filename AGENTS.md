# Praxis Web contributor guide

## Working agreement

- Read `progress.md` before making any change. Compare it with the current codebase and update stale entries before relying on it.
- Update `progress.md` with every change. Record what changed, the current state, verification performed, and any remaining work.
- Make the smallest focused change that completes one feature. Do not mix features in a push.
- Organize commits by feature. Each commit should be cohesive, reviewable, and named for the behavior it changes.
- Limit every push to at most 228 changed lines of product code. Documentation, tests, and configuration files do not count toward this limit.
- Count both added and deleted product-code lines in the push diff. If the limit would be exceeded, split the work into independently valid, single-feature pushes.
- Never bypass required tests or weaken validation to make a build pass.
- Preserve existing user changes. Do not reset, delete, or broadly reformat unrelated work.

Product code means runtime application code, including backend and frontend source and handwritten migration logic that changes runtime behavior. Tests, documentation, package manifests, lockfiles, tool configuration, and CI configuration are excluded from the 228-line count.

## Required workflow

1. Read `progress.md`, then inspect the relevant code, tests, and configuration.
2. Confirm that the requested work is one feature and can fit within the 228-line product-code limit for a single push.
3. Write or update tests alongside the product-code change.
4. Implement the smallest complete solution using strict TypeScript.
5. Run the relevant unit, integration, end-to-end, typecheck, lint, and build commands.
6. Update `progress.md` with the result and exact verification performed.
7. Review the complete push diff for feature scope and product-code line count before pushing.

Do not claim tests, builds, migrations, integrations, or user flows are verified unless the corresponding command or flow was actually run successfully. Record environmental or external blockers explicitly.

## Repository, deployment, and infrastructure tooling

- Use the GitHub CLI to manage the GitHub repository. If the GitHub CLI is not available on the machine, download and install it from an official source, then use it for repository operations.
- Use the Railway CLI to deploy the application and troubleshoot deployment issues. If the Railway CLI is not available on the machine, download and install it from an official source, then use it for Railway operations.
- Use the Cloudflare CLI to manage DNS zones, SSL, and tunneling. If the Cloudflare CLI is not available on the machine, download and install it from an official source, then use it for Cloudflare operations.
- Verify authentication and the selected account, project, environment, zone, or tunnel before making remote changes. Do not expose access tokens or credentials in commands, logs, commits, or `progress.md`.

## Architecture

- Use a monorepo-style separation between the Vite React frontend and NestJS backend. Do not import backend implementation details into the frontend or frontend code into the backend.
- Apply Clean Architecture and domain-driven design. Dependencies point inward: interfaces and infrastructure may depend on application and domain code; domain code must not depend on frameworks, persistence, transport, or UI concerns.
- Group backend code by business feature or bounded context rather than by technical type at the application root.
- Keep shared code small and intentional. Do not move code into a shared package until there is a concrete, stable cross-application need.
- Prefer explicit dependencies and dependency injection over global state or service locators.

## Backend

The backend uses NestJS, TypeScript, Prisma, PostgreSQL, CQRS, Clean Architecture, and domain-driven design.

Use this feature shape unless a feature has a documented reason to differ:

```text
apps/api/src/<feature>/
  domain/          # Entities, value objects, domain services, events, and ports
  application/     # Commands, queries, handlers, use cases, and application DTOs
  infrastructure/  # Prisma repositories and external adapters
  interfaces/      # Nest controllers and transport DTOs
  <feature>.module.ts
```

- Keep the domain layer free of NestJS, Prisma, HTTP, and database imports.
- Put business invariants in entities, value objects, and domain services rather than controllers or Prisma models.
- Define repository and gateway ports in the inner layer; implement them in infrastructure.
- Keep controllers thin: validate transport input, dispatch one command or query, and map the result to a transport response.
- Separate writes into commands and reads into queries. Command handlers may change state; query handlers must not change state.
- Keep command and query contracts explicit and narrowly typed. Do not expose Prisma models as domain entities or API response contracts.
- Map between persistence, domain, application, and transport representations at their boundaries.
- Validate incoming DTOs and reject unknown or invalid data. Do not trust client-supplied authorization or ownership fields.
- Use Prisma migrations for schema changes. Review generated SQL and include compatible migration and rollback/recovery notes in `progress.md`.
- Keep transactions at application or infrastructure boundaries and make multi-write use cases atomic.
- Do not expose secrets, raw database errors, internal stack traces, or sensitive fields.
- Use purposeful errors and structured logging. Avoid logging credentials, tokens, or personal data.

### Backend tests

Every backend product-code change requires:

- focused unit tests for changed domain and application behavior; and
- integration tests that exercise the affected adapters, persistence boundary, or HTTP/API boundary.

Prefer real PostgreSQL-compatible integration behavior where persistence semantics matter. Mock ports at the application boundary in unit tests; do not unit-test Prisma implementation details.

## Frontend

The frontend uses Vite, React, TypeScript, Tailwind CSS, Formik with Yup, and React Router.

- Use strict TypeScript. Do not introduce `any`; model component props, API contracts, form values, and route data explicitly.
- Keep route composition in React Router and keep page components focused on orchestration.
- Extract repeated or stateful behavior into focused components and hooks. Avoid monolithic page components.
- Use Formik for form state and submission, and Yup for a shared, explicit validation schema.
- Keep server calls in dedicated API modules or hooks rather than scattering `fetch` calls through components.
- Treat server validation and authorization as authoritative even when equivalent client validation exists.
- Use Tailwind CSS consistently. Prefer reusable design tokens and components over duplicated arbitrary values.
- Deliver modern, responsive styling with clear hierarchy, useful empty/loading/error states, and consistent spacing.
- Use semantic HTML, visible keyboard focus, accessible labels, sufficient contrast, and keyboard-operable controls.
- Keep derived values out of React state. Clean up effects, subscriptions, timers, and request cancellation.

### Frontend tests

Every frontend product-code change requires:

- focused unit or component tests for the changed behavior; and
- an end-to-end test covering the affected user flow.

Test behavior and accessible outcomes rather than component internals. E2E tests should exercise routing, validation, success, and relevant failure states for the feature.

## Code quality

- Follow SOLID, Clean Code, KISS, and DRY principles pragmatically. Favor clarity over abstraction.
- Keep methods and functions small enough to understand without scrolling through unrelated behavior. Extract a named helper or collaborator when a method has multiple responsibilities or deeply nested branches.
- Use `const` by default, guard clauses for invalid states, and names that describe domain intent.
- Prefer composition over inheritance and narrow interfaces over broad utility services.
- Remove duplication only when the shared concept is stable and naming it makes the code easier to understand.
- Avoid magic strings and numbers. Put meaningful values in domain types, configuration, or named constants at the narrowest useful scope.
- Comments should explain rationale, constraints, or non-obvious tradeoffs, not restate the code.
- Keep public APIs backward compatible unless the feature explicitly includes a coordinated breaking change.

## Verification and handoff

Use the scripts defined by the repository. At minimum, verify the affected application with equivalent commands for:

```text
typecheck
lint
unit tests
backend integration tests (for backend changes)
frontend E2E tests (for frontend changes)
production build
```

Before each push:

- confirm the diff contains only one feature;
- confirm changed product code is no more than 228 added-plus-deleted lines;
- confirm all required tests were added or updated and passed;
- confirm `progress.md` reflects the codebase and verification state; and
- confirm no secrets, local environment files, build output, or unrelated changes are included.
