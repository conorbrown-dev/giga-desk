# Progress

## 2026-09-17 — Shared dashboard spacing and link regression guards

- Removed global/footer link underlines, added an explicit grid gap between work-item cards, and defined desktop/mobile work-item row alignment so identity, status, criteria, and priority retain a predictable reading order.
- Added `styles.test.ts`, which reads the authoritative stylesheet source and guards the no-underline and work-item list/grid contracts. Passed web typecheck, web tests (6 files / 26 tests), web lint, production build, and `git diff --check`. The existing production bundle chunk-size warning remains; no browser route was inspected because the local app still stops at missing Auth0 configuration.

## 2026-09-17 — Shadcn project portfolio migration

- Migrated `/projects` command action, load/error/empty states, summary metrics, and project rows to the installed shadcn Button, Alert, Skeleton, Card, and Badge primitives. Retained the neutral control-center tokens and the dashboard's existing operational metadata hierarchy.
- Passed web typecheck, web tests (5 files / 24 tests), web lint, production build, and `git diff --check`. The production bundle retains its existing >500 kB chunk-size warning. Authenticated browser visual review remains blocked locally by missing Auth0 configuration, as recorded in the preceding backlog migration.

## 2026-09-17 — Shadcn project backlog migration

- Added the official shadcn Base/Nova primitives needed by the project-backlog flow: Card, Badge, Alert, Skeleton, Input, Textarea, Checkbox, Label, Separator, Field, and Collapsible. Corrected the generated Field component's unnecessary optional-chain lint violation without changing its behavior.
- Migrated `/projects/:projectId` status feedback, loading state, work-item rows, and the feature-creation form to shadcn composition while retaining the neutral control-center palette, existing dashboard density, and all API/form behavior. Work-item status now uses `Badge`; feedback uses `Alert`; loading uses `Skeleton`; fields use accessible `Field`/`Input`/`Textarea`/`Checkbox` composition. The native disclosure remains temporarily because the shadcn Collapsible integration lost the post-create feedback state during the live list refresh.
- Passed web typecheck, web tests (5 files / 24 tests), web lint, production build, and `git diff --check`. Browser inspection reached the intended local `/projects/project-2` URL, but the app stops at `Auth0 is not configured`, so an authenticated desktop/mobile screenshot inspection remains pending a configured local test mode or Auth0 session. Continue the remaining routes as separate shadcn migration slices to respect the 228-line product-code release limit.

## 2026-09-16 — shadcn UI foundation

- Initialized shadcn/ui's Base/Nova setup for the Vite application, including its component registry, path aliases, utility helper, and Tailwind v4 integration.
- Mapped shadcn's semantic variables to a Railway/Expo-inspired neutral near-black palette: `#0d0d0f` canvas, `#171719` cards, `#202024` elevated surfaces, neutral borders, and teal/amber/pink only as semantic accents. Removed the legacy olive and light-mode branches while preserving the shell layout.
- Added the shared shadcn Button primitive and adopted it for sign-in, the fallback route, and the primary project action.
- Passed web unit tests (24), typecheck, lint, production build, and diff validation. Browser test-mode inspection confirmed the authenticated shell, neutral token values, and no console warnings; a broad component-by-component migration remains intentionally staged so each product-code change can stay within the repository's 228-line release limit.

## 2026-09-16 — Persist browser authentication across reloads

- Diagnosed the logout after project archival and browser refresh: archive success used a document-level navigation, while the Auth0 provider's default in-memory cache did not survive a new document load.
- Configured the Auth0 React provider to persist its browser cache in local storage and changed the successful archive return to React Router navigation, preserving the active session without a full-page reload.
- Added provider-configuration and client-navigation coverage. Passed web unit tests (24), web typecheck, web lint, and the production web build. A live Auth0 refresh/archival check remains pending deployment.

## 2026-09-16 — Neutral control-center shell alignment

- Replaced the olive-tinted shell colors with a neutral near-black canvas, graphite raised surfaces, and neutral borders inspired by Railway and Expo’s dark product surfaces. Kept teal as a semantic accent rather than a background color.
- Corrected the desktop sidebar’s inherited `space-between` layout so navigation groups begin at the top and flow directly downward. Centered the top-bar account control by removing a stale layout offset and making its control occupy the header height.
- Passed web unit tests (22), web typecheck, web lint, production build, and the targeted Playwright archive flow. Inspected the real local shell at 1440px and 390px plus refreshed archive desktop/mobile screenshots. A prior full navigation-suite attempt remains blocked by two pre-existing Auth0 test-fixture mismatches (expected `demo`/a populated bearer token, current test mode provides `test-user`/an empty token); the initial targeted command also omitted npm's argument separator and did not load Playwright's base URL. Neither failure is caused by the shell styles.

## 2026-09-16 — Allow legacy project archive

- Diagnosed the live archive 500 from Railway logs: PostgreSQL constraint `Project_default_branch_required_check` rejected legacy projects that lack repository configuration when their status was changed to `Archived`.
- Added migration `20260916234500_allow_legacy_project_archive`, which retains repository URL/default-branch requirements for active projects while allowing incomplete legacy projects to be archived. API unit tests (48), API typecheck, API build, Prisma schema validation, and `git diff --check` passed.
- Released commit `d379c63` to Railway production. Applied and read back the migration through the production service (`12 migrations`, schema up to date); deployment `263df78c-3dc8-463e-9739-03d2353fa98a` is online and `GET /api/health` returned `{ "status": "ok" }`. The live authenticated archive action itself was not replayed to avoid archiving another project.

## 2026-09-16 — Project archive reliability and settings page

- Archive confirmation failures now return a deliberate HTTP 400 response instead of an unhandled server error, and the web client distinguishes confirmation, permission, unavailable-project, and transient failures rather than labeling every failure as a name mismatch.
- Archived projects record a `ProjectArchived` activity attributed to the requesting identity. Added focused handler coverage and extended the project API integration scenario for rejected and successful archive requests.
- Rebuilt the project settings route as a responsive control-center lifecycle section, with an explicit confirmation field, case-sensitivity help, and a restrained danger treatment aligned with the active workspace UI.
- Passed web unit tests (22), API unit tests (48), both web/API typechecks, web lint, and both production builds. Ran the mocked Playwright archive route and inspected its desktop and mobile screenshots. The full API integration suite remains blocked in the sandbox because it cannot bind loopback HTTP or connect to PostgreSQL at `127.0.0.1:5442`; its archive case is present but not executed against a database here.

## 2026-09-16 — Auth0-only browser authentication

- Replaced the one-time popup authentication snapshot with the Auth0 React provider and redirect flow. API calls now request Auth0 access tokens for the configured Giga Desk API audience.
- Added Auth0 setup documentation covering Auth0 API permissions, SPA callback/logout/web-origin configuration, MFA, and Railway variable parity.
- Corrected Railway's `AUTH_JWKS_URL` to the configured Auth0 tenant's standard JWKS endpoint and read back matching SPA/API audience, issuer, and JWKS relationships. Passed web unit tests (4 files, 21 tests), typecheck, lint, production build, and the 10-test browser suite using an explicit Auth0 test mode. Repository-wide lint remains blocked by the pre-existing unused `actorId` in `prisma-project.repository.ts`; integration tests are blocked because local PostgreSQL is unavailable at `127.0.0.1:5442`. A real MFA redirect and Auth0 API RBAC permission assignment readback remain pending.

## 2026-09-16 — Serve the web application from the production API service

- Found the production Railway custom domain routed to the single `giga-desk` service, whose logs show only the Nest API routes. `GET /` therefore returned 404.
- Added API static hosting for the existing `apps/web/dist` Vite bundle, with an SPA fallback for client routes and an explicit `/api` bypass.
- Added a focused unit test for the static-hosting and API-bypass behavior.
- Passed API unit tests (25 files, 47 tests), API typecheck, API build, and web build. API lint is blocked by a pre-existing unused `actorId` in `prisma-project.repository.ts`; the new hosting test now complies with lint rules. Pull request #7 is open; Railway deployment/HTTP readback remains pending until it is merged and deployed.
