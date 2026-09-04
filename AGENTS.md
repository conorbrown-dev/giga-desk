# Praxis Web contributor guide

## Working agreement

- Giga Desk is a customer-facing web application. Customer worker installers must use the versioned worker bundle provided by the application; never require a customer to have the private Giga Desk source checkout. A newly installed worker may register and heartbeat before customer repositories exist, but must not claim work until its approved customer repository mappings are configured.
- Prefer configuration through the authenticated Giga Desk web app and API whenever the worker can securely retrieve it. Minimize node-side manual editing, commands, and restarts; keep only unavoidable runtime prerequisites and secrets on the worker host.
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

> IMPORTANT: For substantial rendered frontend work, use the Build Web Apps
> plugin when available. Functional correctness alone does not satisfy frontend
> acceptance criteria. UI changes must be rendered, visually inspected, and
> iterated before they are considered complete.

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

## Frontend UI/UX Development

Frontend visual quality is a first-class acceptance criterion for this project. A frontend task is not complete merely because the feature works.

### Build Web Apps Plugin

When the **Build Web Apps** Codex plugin is available, use it for work involving rendered frontend surfaces.

This includes:

* Creating new pages or application screens
* Creating new significant UI components
* Redesigning existing screens
* Translating screenshots, mockups, or visual references into application UI
* Improving visual polish
* Responsive layout work
* UX improvements
* Significant CSS or styling changes
* Debugging rendered frontend behavior
* Verifying that an implementation visually matches an intended design

Do not treat use of the Build Web Apps plugin as optional for substantial frontend UI/UX work when the plugin is available.

### Design and Redesign Work

For new visual design, significant redesigns, or work that must match a visual reference, use the Build Web Apps `frontend-app-builder` skill.

Do **not** immediately begin implementing components from a vague interpretation of the requirements.

Follow this workflow:

1. Inspect the existing application.
2. Inspect relevant screenshots, mockups, examples, style references, and existing design conventions.
3. Understand the purpose of the screen and the user's primary workflow.
4. Establish the intended visual direction before implementation.
5. Identify or derive the design system:

   * typography
   * type scale
   * spacing
   * layout/grid
   * border radius
   * elevation/shadows
   * colors
   * component hierarchy
   * interaction states
   * responsive behavior
6. Implement the design using the project's existing architecture and component system.
7. Run the actual application.
8. Inspect the rendered result in a browser.
9. Compare the rendered result against the intended design and supplied references.
10. Correct visual discrepancies.
11. Repeat browser inspection and refinement until the implementation is polished.

Do not stop after the first technically correct implementation.

### Visual References

When visual references are supplied, treat them as design requirements rather than loose inspiration unless the task explicitly states otherwise.

Analyze references for:

* overall composition
* information hierarchy
* density
* whitespace
* typography
* component proportions
* alignment
* visual rhythm
* navigation patterns
* card/table/form treatment
* icon usage
* color usage
* responsive behavior
* interaction patterns

Reproduce the **design language and UX qualities** of the reference without blindly copying irrelevant content or structure.

Avoid producing a generic approximation simply because it contains the same types of controls.

### Avoid Generic AI UI

Do not default to stereotypical AI-generated SaaS/dashboard design patterns unless they genuinely fit the product.

Examples of patterns that should not be introduced without a reason include:

* excessive rounded cards
* cards nested inside cards
* excessive gradients
* unnecessary pill-shaped controls
* oversized hero copy in application screens
* arbitrary colored icon containers
* excessive use of muted gray text
* huge amounts of unused whitespace
* every section appearing as an independent floating panel
* decorative charts or metrics that do not help the user's workflow
* identical visual hierarchy for unrelated pieces of information

Prefer a deliberate product-specific design derived from the application's purpose and supplied references.

### Preserve Existing Design Systems

Before creating new styles or components, inspect the repository for:

* shared components
* theme definitions
* design tokens
* CSS variables
* typography rules
* spacing conventions
* existing layouts
* existing responsive breakpoints
* existing component-library abstractions

Reuse these where appropriate.

Do not create a parallel design system inside an individual feature.

If the existing design system is itself the subject of the redesign, improve it deliberately rather than working around it locally.

### React Implementation

After meaningful React or Next.js component changes, use the Build Web Apps `react-best-practices` guidance when available.

Maintain existing repository conventions for:

* component organization
* state management
* data fetching
* routing
* accessibility
* error handling
* loading states
* testing
* TypeScript usage

Visual improvements must not degrade architecture or maintainability.

### Frontend Validation

For any meaningful change to a rendered frontend surface, use the Build Web Apps `frontend-testing-debugging` workflow when available.

Validation must cover both **behavior and appearance**.

At minimum, inspect:

* the primary user flow
* layout
* alignment
* typography
* spacing
* overflow
* responsive behavior
* loading states
* empty states
* error states where relevant
* hover/focus/active states where relevant
* console errors
* obvious accessibility problems

If the Browser plugin is available, prefer the browser-based validation workflow provided by the skill.

If it is unavailable and the Build Web Apps workflow permits it, use the repository's existing browser/E2E tooling such as Playwright.

### Responsive Design

Do not assume that a desktop implementation that compiles is responsive.

For meaningful UI work, verify representative viewport sizes for:

* desktop
* tablet where applicable
* mobile

Look specifically for:

* horizontal overflow
* truncated content
* collapsed navigation problems
* unusable tap targets
* inappropriate fixed widths
* poorly wrapping text
* broken grids
* controls that become inaccessible

### Definition of Done for Frontend Work

Frontend work is complete only when all applicable criteria are satisfied:

* functionality works
* tests/checks pass
* the rendered application has been inspected
* the implementation matches the intended visual direction
* supplied style references have been meaningfully honored
* visual hierarchy is clear
* typography and spacing are deliberate
* responsive behavior has been verified
* interactive states are usable
* no obvious browser-console errors remain
* accessibility has not obviously regressed
* the implementation fits the application's existing architecture
* no obvious visual-polish issues remain

When there is a conflict between "technically functional" and "visually finished," the task is **not done**.

### Existing Poor UI

When asked to improve an existing screen, do not preserve poor visual decisions simply because they already exist.

Preserve:

* required behavior
* domain semantics
* user data
* business rules
* appropriate architectural boundaries

Visual structure, styling, hierarchy, layout, and interaction design may be substantially changed when doing so produces a better user experience.

### Reporting Completion

When completing substantial frontend work, summarize:

* what was visually changed
* what UX behavior changed
* which Build Web Apps skills were used
* what browser/rendered validation was performed
* which viewport sizes or important states were checked
* any remaining visual limitations or follow-up work

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
