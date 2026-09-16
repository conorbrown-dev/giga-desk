# Progress

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
