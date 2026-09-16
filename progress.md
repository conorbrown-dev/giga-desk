# Progress

## 2026-09-16 — Auth0-only browser authentication

- Replaced the one-time popup authentication snapshot with the Auth0 React provider and redirect flow. API calls now request Auth0 access tokens for the configured Giga Desk API audience.
- Added Auth0 setup documentation covering Auth0 API permissions, SPA callback/logout/web-origin configuration, MFA, and Railway variable parity.
- Corrected Railway's `AUTH_JWKS_URL` to the configured Auth0 tenant's standard JWKS endpoint and read back matching SPA/API audience, issuer, and JWKS relationships. Passed web unit tests (4 files, 21 tests), typecheck, lint, production build, and the 10-test browser suite using an explicit Auth0 test mode. Repository-wide lint remains blocked by the pre-existing unused `actorId` in `prisma-project.repository.ts`; integration tests are blocked because local PostgreSQL is unavailable at `127.0.0.1:5442`. A real MFA redirect and Auth0 API RBAC permission assignment readback remain pending.

## 2026-09-16 — Serve the web application from the production API service

- Found the production Railway custom domain routed to the single `giga-desk` service, whose logs show only the Nest API routes. `GET /` therefore returned 404.
- Added API static hosting for the existing `apps/web/dist` Vite bundle, with an SPA fallback for client routes and an explicit `/api` bypass.
- Added a focused unit test for the static-hosting and API-bypass behavior.
- Passed API unit tests (25 files, 47 tests), API typecheck, API build, and web build. API lint is blocked by a pre-existing unused `actorId` in `prisma-project.repository.ts`; the new hosting test now complies with lint rules. Pull request #7 is open; Railway deployment/HTTP readback remains pending until it is merged and deployed.
