# Progress

## 2026-09-16 — Serve the web application from the production API service

- Found the production Railway custom domain routed to the single `giga-desk` service, whose logs show only the Nest API routes. `GET /` therefore returned 404.
- Added API static hosting for the existing `apps/web/dist` Vite bundle, with an SPA fallback for client routes and an explicit `/api` bypass.
- Added a focused unit test for the static-hosting and API-bypass behavior.
- Passed API unit tests (25 files, 47 tests), API typecheck, API build, and web build. API lint is blocked by a pre-existing unused `actorId` in `prisma-project.repository.ts`; the new hosting test now complies with lint rules. Pull request #7 is open; Railway deployment/HTTP readback remains pending until it is merged and deployed.
