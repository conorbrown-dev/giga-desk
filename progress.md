# Progress

## Current state

- Repository template initialized with contributor, architecture, testing, and delivery guidance.
- The ordered project reference pack has been reviewed and a baseline architecture assessment is recorded in `docs/10_ARCHITECTURE_ASSESSMENT.md`.
- The starting checkout was documentation-only, so the new application foundation follows the recorded architecture assessment rather than pre-existing runtime conventions.
- Contributor guidance requires GitHub, Railway, and Cloudflare CLI tooling for repository, deployment, and infrastructure operations.
- npm workspaces now separate the strict-TypeScript NestJS API, Vite/React web application, Node polling agent simulator, and production-neutral machine API client.
- The API exposes a minimal `/api/health` readiness boundary; the web shell provides routed home and project-list states.
- PostgreSQL and Prisma configuration now define the initial Project, WorkItem, acceptance-criteria, dependency, and immutable activity persistence model.
- Framework-free Project and WorkItem domain objects enforce key normalization, required feature acceptance criteria, workflow transitions, and prerequisite completion.
- API routes are protected by default with provider-neutral RS256 JWT verification using configured issuer, audience, and remote JWKS values; `/api/health` is explicitly public and `/api/auth/me` returns the verified subject and permissions.
- Browser authentication now uses Keycloak's authorization-code flow with S256 PKCE; the API accepts known Giga Desk permissions from Keycloak realm roles while retaining the provider-neutral JWT boundary.
- Authenticated identities with `projects:create` can create Projects through a CQRS command; creation persists the domain object and immutable `ProjectCreated` activity atomically.
- Authenticated identities with `projects:read` can retrieve the 50 most recently updated, non-archived Projects through a dedicated CQRS read model.
- Authenticated identities with `work-items:create` can create a Feature under a Project with structured, ordered acceptance criteria and an immutable `FeatureCreated` activity.
- Authenticated identities with `projects:read` can retrieve a Project's ordered work-item projection, including hierarchy, workflow state, priority, and structured criteria.
- Authenticated identities with `work-items:update` can apply valid WorkItem status transitions; starting work checks prerequisites, persistence uses optimistic concurrency, and each transition appends an attributed activity.
- PostgreSQL now persists ExecutionNode, Agent, AiModel, and ExecutionJob separately with registry uniqueness, historical WorkItem attempts, query indexes, restrictive history foreign keys, and database-level numeric invariants.
- Authenticated identities with `executions:read` can retrieve enabled execution nodes, agents, and models through an explicit execution-context registry projection.
- Authenticated identities with `executions:create` can queue Start Work for a compatible, available node/agent/model selection; the transaction reserves node capacity, readies the WorkItem, creates the job, and appends audit activities.
- Worker JWTs can carry an execution-node identity; that node alone can discover its oldest queued jobs and atomically claim one, with repeat claims rejected and attributed activity appended.
- A machine-authenticated execution node can heartbeat only its own enabled registry record; the API records liveness and derives Online or Busy status from reserved capacity.
- An idempotent provisioning command registers MIRIAM, the installed Codex CLI version, and a provider-neutral Codex default-model selection without storing credentials; superseded Codex agent versions are disabled.
- Production contains the MIRIAM/Codex CLI 0.152.0 target; its node-scoped Keycloak identity and real heartbeat are verified, and the installed worker user service is enabled and running while the production queue remains empty.
- A node can retrieve a structured Work Package only for its claimed active job, including project/repository context, WorkItem criteria and relationships, selected runtime/model, and explicit test/deployment expectations.
- PostgreSQL now stores idempotent execution progress, typed Unit/Integration/E2E results, and deployments linked to Project, WorkItem, and ExecutionJob, with evidence indexes and numeric checks.
- A claimed node can atomically start execution, moving its job to Running and WorkItem to InProgress, then publish idempotent progress events while the job remains active.
- A node can report idempotent Unit/Integration results while active and EndToEnd results only after deployment; automated tests move both job and WorkItem into Testing and persist attributed evidence.
- Deployment reporting requires latest passing Unit and Integration evidence, persists idempotently, and moves successful work to E2E Testing; failed/rolled-back deployments terminate the job, block the WorkItem, and release node capacity.
- A node can complete an E2E-tested execution only when all three test stages, deployment, and every acceptance criterion pass; completion atomically marks the job and WorkItem Completed, satisfies criteria, records terminal audit events, and releases node capacity with idempotent retry handling.
- A worker can report an active execution failure with an idempotency key; the transaction records the reason and terminal audit events, blocks the WorkItem, releases node capacity, and rejects later non-idempotent terminal changes.
- Authenticated users with `work-items:read` can retrieve explicit execution history for a WorkItem, including selected targets, lifecycle timestamps, progress, test evidence, deployment evidence, source-control metadata, and failure reasons.
- The web app now provides a typed execution-history client and `/work-items/:workItemId` dashboard route with accessible loading/error/empty states and evidence summaries.
- The web app now loads authenticated Project and WorkItem projections, with project-list and project-work routes linking users through to each WorkItem's execution history.
- Every authenticated route now renders inside the centered, bounded main-content shell instead of allowing page forms and dashboards to stretch edge-to-edge.
- The authenticated web shell now uses a responsive primary navigation with a branded home link, account context, a styled sign-out action, cohesive link/button states, and visible keyboard focus.
- Authenticated users can open an in-app Connect Agent guide: Codex provides a persisted, security-aware machine-setup checklist, while Claude and Grok are visible as disabled future providers.
- WorkItem execution pages now provide an authenticated Formik/Yup Start Work flow that loads available targets, narrows models by agent provider compatibility, queues the selection, and refreshes history.
- Start Work now records an explicit protected-production-action approval per execution; that decision is audited and delivered in the Work Package, and the worker rejects clearly sensitive tasks before Codex runs unless approval was checked.
- The Project portfolio now includes a validated browser form for creating Projects and immediately refreshes with the persisted result.
- Project work-item pages now include a validated browser form for creating Features with one acceptance criterion per line and immediately refresh with the persisted result.
- Feature creation accepts up to three bounded PNG, JPEG, or WebP visual references; PostgreSQL persists the image bytes, Work Packages transport them, and the Codex worker supplies private temporary files through repeatable `--image` arguments without placing base64 data in the text prompt.
- `npm run demo` starts isolated application and Keycloak PostgreSQL databases, imports a local-only Keycloak realm, builds both applications, and serves the authenticated browser UI.
- Production API, web/Caddy, and Keycloak images are defined for an isolated five-service Railway topology; the application and identity databases remain separate.
- Production API and web image dependency stages include every npm workspace manifest, including the agent simulator, so root `npm ci` remains reproducible as workspaces are added.
- API image builds regenerate Prisma after source/config copy and exclude host-generated clients from Docker context; Keycloak is augmented in a PostgreSQL-aware build stage before optimized startup.
- Railway project `giga-desk` runs five isolated production services; web and Keycloak have public Railway domains while API and both PostgreSQL services remain private-network only.
- The production Keycloak realm requires S256 PKCE for the exact web origin, adds the `giga-desk-api` audience, and grants the initial `conor` user only the seven human application roles.
- Railway point-in-time recovery is intentionally disabled for both production PostgreSQL services to avoid unnecessary early-stage backup storage expense; database volumes remain live, but no recovery window is retained.
- GitHub Actions now defines the complete local-shaped CI gate with PostgreSQL, real Keycloak login, typecheck, lint, unit/integration/E2E tests, and production builds.
- A development-only polling simulator obtains and caches short-lived OIDC client-credentials tokens, heartbeats its node, and can claim one queued job at a time through the complete simulated progress, test, deployment, E2E, and completion lifecycle; an injected token remains available for isolated tests.
- Machine API and OIDC client-credentials behavior now live in a dedicated shared workspace, keeping the production worker boundary independent of the synthetic simulator.
- A production Codex executor launches non-interactive ephemeral runs without a shell, restricts edits to workspace-write, and rejects malformed or incomplete structured evidence.
- The MIRIAM worker runtime polls one job at a time, enforces an exact repository allowlist and evidence set, reports the real lifecycle in API order, and heartbeats continuously under a restartable user service.
- Repository scripts cover typecheck, lint, unit tests, API integration tests, frontend E2E tests, and production builds.

## Handoff — 2026-09-02

- The visual-reference pipeline is locally verified end to end: repository typecheck, lint, 55 unit/component tests, 12 PostgreSQL/HTTP worker integration tests, five real-Keycloak browser flows, all five production builds, migration deployment/status, and the worker's exact temporary-image bytes/CLI arguments passed. No production deployment or live MIRIAM job is claimed.
- The authenticated content-shell fix is locally verified: web typecheck, lint, nine component tests, production build, and five real-Keycloak Playwright flows passed. The browser flow now asserts the desktop content width remains bounded; no deployment or live production visual claim has been made.
- The approval-gate feature commit `eac41f1` was pushed and deployed. GitHub CI run `33646334055` passed migrations, typecheck, lint, 54 unit tests, 12 integration tests, five real-Keycloak E2E flows, and all five production builds in 2m14s. Railway API, web, and Keycloak deployments succeeded; the API applied migration `20260902143000_execution_protected_action_approval` and returned `{"status":"ok"}` from `/api/health`.
- MIRIAM's protected worker configuration and installed user service are active; the node-scoped identity/heartbeat were verified and the production queue was empty during preflight. Live readback on 2026-09-02 reports `giga-desk-codex-worker.service` enabled, active, and running.
- The approval-gate feature records a per-execution approval for protected production actions, delivers that decision in the Work Package, and blocks clearly sensitive tasks before Codex runs when approval is absent. Production contains the applied migration and the worker service is enabled and running.

### Continuation sequence

1. ✅ Commit the approval-gate diff as one cohesive feature (52 product-code lines; within the 228-line limit).
2. ✅ Pushed and wait for CI verification; Railway rollout completed with successful migration application and API health check.
3. ✅ Enabled the installed MIRIAM user service after the deployed API understood the approval field.
4. Queue one harmless real production Work Package and verify live heartbeat, claim, lifecycle callbacks, and the browser flow; do not use the simulator against production.
5. For a sensitive task, require human review and check "Approve protected production actions" only after that review. The current detector is intentionally fail-closed and keyword-based; a richer PR/app approval workflow remains future work.
6. Unlock the final Codex tutorial step only after the real worker acceptance succeeds.

## Verification

- `npm exec prisma migrate deploy -- --config apps/api/prisma.config.ts` and `npm exec prisma migrate status -- --config apps/api/prisma.config.ts` — passed against local PostgreSQL; migration `20260902173000_work_item_visual_references` is applied and the schema is current.
- `npm run typecheck`, `npm run lint`, and `npm test` — passed after visual-reference delivery across all five workspaces; 55 unit/component tests passed.
- `npm run test:integration` — passed after the final oversized-request coverage update: nine API files/ten tests plus one shared-client and one real-worker HTTP-boundary test.
- `PLAYWRIGHT_REUSE_EXISTING=true npm run test:e2e -w @giga-desk/web` — passed all five real-Keycloak browser flows, including Feature image selection and exact request serialization.
- `npm run build` — passed all five production builds after visual-reference delivery.
- Read `README.md`, `AGENTS.md`, and `docs/00_READ_ME_FIRST.md` followed by reference documents `01` through `09` in numerical order.
- Inspected the complete repository file inventory and confirmed it contains only policy and project documentation.
- `npm run typecheck` — passed for both workspaces.
- `npm run lint` — passed for both workspaces.
- `npm test` — passed: one frontend component test and one API unit test.
- `npm run test:integration` — passed: one API HTTP integration test (required local port access outside the network sandbox).
- `npm run test:e2e` — passed: one Playwright navigation flow using the installed Chromium runtime.
- `npm run build` — passed for both production applications.
- `npm exec prisma migrate status -- --config prisma.config.ts` — passed against local PostgreSQL; the initial migration is applied and the schema is current.
- `npm run test:integration` — passed after adding the persistence foundation: three API integration test files passed against local PostgreSQL and the Nest HTTP boundary.
- `npm run lint` — passed after replacing unsafe non-null assertions in the persistence integration test with an explicit guard.
- `npm run test:integration` — passed with five API integration files after authentication: missing/invalid bearer tokens are rejected, a verified identity is returned, and the real JOSE adapter validates a signed RS256 token through a local JWKS endpoint.
- `npm run typecheck` and `npm run lint` — passed after the authentication boundary and adapter coverage were added.
- `npm test` — passed after Project creation: one web component test and 14 API unit tests across six files.
- `npm run test:integration` — passed six API integration files, including 401, 403, unknown-field 400, successful Project persistence/audit, and duplicate-key 409 behavior.
- `npm run typecheck` and `npm run lint` — passed after the Project creation CQRS slice.
- `npm test` — passed after the Project list query: one web component test and 15 API unit tests across seven files.
- `npm run test:integration` — passed six API integration files after Project listing and isolated dependency-fixture cleanup; unauthenticated listing returns 401 and a read-authorized identity receives the persisted projection.
- `npm test` — passed after Feature creation: one web component test and 16 API unit tests across eight files.
- `npm run test:integration` — passed six API integration files after Feature creation, covering permission denial, criteria validation, atomic persistence/audit, and an unknown-Project 404.
- `npm run typecheck`, `npm run lint`, and `npm test` — passed after the work-item read model; API unit coverage is 17 tests across nine files.
- `npm run test:integration` — passed six API integration files after the work-item read model, including authorized projection data and unknown-Project 404 behavior.
- `npm run typecheck`, `npm run lint`, and `npm test` — passed after status transitions; API unit coverage is 19 tests across ten files.
- `npm run test:integration` — passed six API integration files after status transitions, including permission denial, invalid-transition conflict, successful optimistic update/activity, and missing-item 404 behavior.
- `npm exec prisma migrate status -- --config prisma.config.ts` — passed after execution persistence; all three migrations are applied and current.
- `npm run typecheck`, `npm run lint`, and `npm run test:integration` — passed after regenerating the Prisma client; seven integration files now cover the separate execution registry/job relationships.
- Focused execution persistence test passed with deprecation tracing and no warning after avoiding Prisma's open `adapter-pg` write-with-multiple-includes regression.
- `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:integration` — passed for the execution-target registry; API unit coverage is 20 tests across 11 files and integration coverage is eight files.
- `npm run typecheck`, `npm run lint`, and `npm test` — passed after Start Work; API unit coverage is 22 tests across 12 files.
- `npm run test:integration` — passed eight API integration files after Start Work, covering permission denial, compatible job creation, node capacity reservation, WorkItem readiness, audit history, and duplicate-active-job conflict.
- `npm run typecheck`, `npm run lint`, and `npm test` — passed after node-scoped discovery/claim; API unit coverage is 23 tests across 13 files.
- `npm run test:integration` — passed eight API integration files after discovery/claim, including node-scope denial, queued discovery, atomic claim, repeat-claim 409, and worker audit attribution.
- `npm run typecheck`, `npm run lint`, and `npm test` — passed after Work Package retrieval; API unit coverage is 24 tests across 14 files.
- `npm run test:integration` — passed eight API integration files after Work Package retrieval, including wrong-node 404 isolation and the full structured contract for the claimed job.
- `npm run typecheck`, `npm run lint`, and `npm run test:integration` — passed after execution evidence persistence; duplicate progress keys are rejected and progress/test/deployment relations are verified.
- `npm run typecheck`, `npm run lint`, and `npm test` — passed after execution start/progress; API unit coverage is 26 tests across 15 files.
- `npm run test:integration` — passed eight API integration files after start/progress, covering wrong-node isolation, invalid-state conflicts, atomic job/WorkItem start, activity history, and retry deduplication.
- `npm run typecheck`, `npm run lint`, and `npm test` — passed after test reporting; API unit coverage is 28 tests across 16 files.
- `npm run test:integration` — passed nine API integration files/ten tests after test reporting, covering retry deduplication, Testing transitions, evidence persistence, and early-E2E rejection.
- `npm run typecheck`, `npm run lint`, and `npm test` — passed after deployment reporting; API unit coverage is 29 tests across 17 files.
- `npm run test:integration` — passed nine API integration files/ten tests after deployment reporting, including pre-deployment test gates, retry deduplication, persisted deployment evidence, and successful E2E transition.
- `npm run typecheck` — passed after completion callback wiring and evidence-gate tests.
- `npm run lint` — passed after completion callback wiring and focused domain tests.
- `npm run test -w @giga-desk/api -- --run` — passed: 32 API unit tests across 18 files.
- `npm run test:integration` — passed nine API integration files/ten tests after completion reporting, including rejected incomplete evidence, terminal state transitions, criterion satisfaction, audit history, capacity release, and idempotent retry.
- `npm run typecheck` and `npm run lint` — passed after the failure callback and repository wiring.
- `npm run test:integration` — passed nine API integration files/ten tests after failure reporting, including queue/claim/start, terminal failure persistence, blocked WorkItem state, capacity release, and idempotent retry.
- `npm run test:integration` — passed nine API integration files/ten tests after adding execution-history projection coverage, including authenticated terminal evidence and deployment summaries.
- `npm test` — passed: one frontend component test and 32 API unit tests across 18 files.
- `npm run build` — passed for both production applications after terminal execution callbacks.
- `npm run test:e2e` — passed: one Playwright navigation flow using the installed Chromium runtime (local loopback access required).
- `npm run lint`, `npm run typecheck`, and `npm test` — passed after the execution dashboard client/route; frontend coverage is two component tests and API coverage remains 32 unit tests across 18 files.
- `npm run test:e2e` — passed: one Playwright navigation flow after the dashboard route was added.
- `npm run typecheck`, `npm run lint`, and `npm test` — passed after project/work-item navigation; frontend coverage is three component tests and API coverage is 31 source unit tests across 17 files.
- `npm run test:integration` — passed eight source integration files/nine tests against the local PostgreSQL service after excluding ignored compiled `dist` output from Vitest discovery; the first sandboxed run was blocked by local listener/database isolation and PostgreSQL then required starting.
- `npm run build` — passed for both production applications after project/work-item navigation.
- `npm run test:e2e` — passed: two Playwright tests cover navigation from home through a Project and WorkItem to execution history plus the authentication failure state; local loopback access was required.
- `npm exec prisma migrate status -- --config prisma.config.ts` — passed against the restarted local PostgreSQL service; all six migrations are applied and the schema is current.
- `npm run typecheck`, `npm run lint`, and `npm test` — passed after Start Work controls; frontend coverage is four component tests and API coverage is 31 source unit tests across 17 files.
- `npm run test:integration` — passed all eight source integration files/nine tests after Start Work controls against the healthy local PostgreSQL service.
- `npm run build` — passed for both production applications after Start Work controls.
- `npm run test:e2e` — passed: three Playwright tests, including required Start Work validation, successful authenticated submission, and conflict feedback.
- `npm test` — passed after browser creation and demo mode: six frontend component tests and 32 API unit tests across 18 source files.
- `npm run test:integration` — passed nine source integration files/ten tests, including the real local-demo authentication HTTP boundary.
- `npm run test:e2e` — passed four Playwright tests, including the complete authenticated create-Project → open-Project → create-Feature flow.
- `npm run demo` — launched PostgreSQL, the API on port 3000, and Vite on port 5173 after correcting a launcher-only JavaScript syntax error found by the first live attempt.
- Live browser verification against the real API/PostgreSQL stack created `RYSHOW1 · Ryan Showcase`, added `Browser project planning demo`, and confirmed all three acceptance criteria were persisted and rendered; no browser console errors were reported.
- Package installation audited 542 packages with zero reported vulnerabilities after adding the JOSE verifier and Nest CQRS dependencies.
- `npm run typecheck`, `npm run lint`, and `npm test` — passed after Keycloak integration: seven frontend component tests and 31 API unit tests across 17 source files.
- API `typecheck`, `lint`, and 32 unit tests across 18 source files passed after execution-node heartbeat; all eight API integration files/nine tests passed against PostgreSQL and the Nest HTTP boundary, including wrong-node denial and persisted heartbeat status/time.
- `npm run build` — passed for the web, API, and agent-simulator production builds after execution-node heartbeat.
- API `typecheck`, `lint`, and 34 unit tests across 19 source files passed for Codex target provisioning; all nine API integration files/ten tests passed, including idempotent metadata refresh and compatible node/agent/model persistence.
- `npm run build` passed all three workspaces, and the built `target:codex` command successfully provisioned MIRIAM/Codex CLI 0.152.0 in the local development database with non-secret node, agent, and model IDs.
- GitHub CI runs `33628752371` (heartbeat) and `33629261834` (Codex provisioning) passed every gate.
- Railway production deployments for commit `9f067af` succeeded for API, web, and Keycloak; both PostgreSQL services remained healthy, the proxied `/api/health` returned `{"status":"ok"}`, and two production provisioner runs returned the same node (`47af9a18-dada-4bf8-ad8a-95a6fce737af`), agent, and model IDs.
- `npm run test:integration` — passed all eight API integration files/nine tests; the real JOSE adapter maps a known Keycloak realm role and rejects non-application roles.
- `npm run test:e2e` — passed all four browser flows through the real local Keycloak login, including protected routing, Start Work, and create-Project → create-Feature.
- `npm run build` — passed for both applications after Keycloak integration.
- Production API, web, and Keycloak Docker images built successfully; the API image applied all six Prisma migrations and returned `{"status":"ok"}`, while the Caddy image returned `healthy`.
- `npm audit --omit=dev` — passed with zero vulnerabilities after overriding Prisma's transitive, unused MySQL driver to its patched `3.22.0` release.
- `npm install` — audited 544 packages with zero vulnerabilities after adding the isolated simulator workspace; a later standalone `npm audit --omit=dev` refresh was blocked by restricted registry egress, so no second live audit result is claimed.
- `npm run typecheck` and `npm run lint` — passed across the API, web, and agent-simulator workspaces.
- `npm test` — passed 40 tests: seven web component tests, 31 API unit tests, and two simulator lifecycle tests.
- `npm run test:integration` — passed eight API files/nine PostgreSQL-backed tests plus one simulator real-HTTP boundary test; localhost/database access was required outside the sandbox.
- `npm run test:e2e` — passed all four Playwright flows through the real local Keycloak login after the simulator was added.
- `npm run build` — passed production builds for the web, API, and agent simulator.
- Clean API Docker build passed without host-generated Prisma sources, and a disposable container imported the compiled client successfully (`PRISMA_IMPORT_OK`).
- Clean Keycloak Docker build passed; `show-config` reports production mode, persisted PostgreSQL support, health/metrics, and `kc.optimized = true`.
- Railway project `giga-desk` was created with isolated application/Keycloak PostgreSQL services, API, web, and Keycloak. Corrected deployments are all `SUCCESS`; the API applied all six migrations and the web proxy returns `healthy` plus `{"status":"ok"}` from `/api/health`.
- Production Keycloak readback confirmed a public authorization-code client with direct grants disabled, exact redirect/web origins, required S256 PKCE, the `giga-desk-api` audience mapper, and the expected seven human roles on `conor`.
- Live headless-browser acceptance passed (`PRODUCTION_ACCEPTANCE_OK`): the temporary credential rotated without disclosure, Keycloak login succeeded, the production API accepted the token, and `PRODCHK · Production Acceptance` plus its Feature persisted with no console errors.
- Railway CLI decommissioned PITR on `giga-desk-postgres` and `giga-desk-keycloak-postgres`; both standalone services redeployed successfully and now report `enabled: false` plus `bucketWired: false`. `railway bucket list --json` returns no production buckets, while the proxied API health endpoint and exact Keycloak realm issuer remain healthy. This intentionally removes database point-in-time restore capability.
- Initial GitHub Actions run `33582831124` passed setup, Keycloak readiness, typecheck, lint, and unit tests, then correctly failed integration tests because CI had not migrated its empty PostgreSQL database. Corrected run `33583018180` applied all six migrations and passed every gate. Official action release readback identified `actions/checkout@v7` and `actions/setup-node@v7` as current; final run `33583242096` used those Node 24 action releases and passed migrations, typecheck, lint, 40 unit tests, 10 integration tests, four real-Keycloak E2E flows, and all three production builds in 2m14s without the deprecated-runtime warning.
- Authenticated navigation styling: web typecheck, lint, eight component tests, production build, and all four real-Keycloak Playwright flows passed. A separate local Chrome visual inspection was not completed because an unrelated extension panel held browser control, so no manual visual claim is made.
- Connect Agent tutorial: web typecheck, lint, nine component tests, and production build passed; five real-Keycloak Playwright flows passed, including authenticated navigation, checklist progress, reload persistence, and disabled future-provider states.
- OIDC polling-agent authentication: repository-wide typecheck, lint, and production builds passed for all three workspaces; unit tests passed (web one file/nine tests, API 19 files/34 tests, agent two files/four tests). The complete integration gate passed outside sandbox isolation (API nine files/ten tests and agent one file/test), and all five real-Keycloak Playwright flows passed, including the enabled machine-identity step and still-disabled real-worker step.
- Shared machine API client: repository-wide typecheck, lint, unit tests, and production builds passed across four workspaces; the API's nine PostgreSQL-backed integration files/ten tests and the shared client's localhost HTTP-boundary test passed outside sandbox isolation, as did all five real-Keycloak Playwright flows. `npm install` audited 546 packages with zero vulnerabilities.
- Production Codex executor: repository-wide typecheck, lint, unit tests, and production builds passed across five workspaces; worker coverage includes two executor tests. The API's nine PostgreSQL-backed integration files/ten tests, shared-client HTTP-boundary test, and all five real-Keycloak Playwright flows passed outside sandbox isolation.
- Production Codex worker lifecycle: repository-wide typecheck, lint, unit tests, and production builds passed across five workspaces; worker coverage is five tests across executor and lifecycle behavior. The full integration gate passed outside sandbox isolation (API nine files/ten tests plus one shared-client and one real worker HTTP-boundary test), as did all five real-Keycloak Playwright flows. `npm install` audited 548 packages with zero vulnerabilities.
- GitHub CI run `33640560628` passed migrations, typecheck, lint, 49 unit tests, 12 integration tests, five real-Keycloak E2E flows, and all five production builds for worker commit `7124bc9` in 2m52s. Railway API, web, and Keycloak deployments for that commit all report `SUCCESS` with running instances.
- MIRIAM service preflight verified `codex-cli 0.152.0` and its existing ChatGPT login from a transient user-service context, an empty production queue, protected worker configuration (`0600`), and an installed service definition (`0644`). `giga-desk-codex-worker.service` remains disabled and inactive; no production job has been claimed.
- Protected production action approval: repository-wide typecheck, lint, 54 unit tests, 12 integration tests, five real-Keycloak E2E flows, and all five builds passed. PR opened and merged after CI passed; Railway production deployments for commit `eac41f1` succeeded for API, web, and Keycloak; both PostgreSQL services remained healthy; the API applied migration `20260902143000_execution_protected_action_approval` and returned `{"status":"ok"}` from `/api/health`.
- MIRIAM user service enabled and running: service starts successfully, polls production queue every 5 seconds, no queued jobs currently available for claim.
- GitHub CI run `33634761790` passed migrations, typecheck, lint, 47 unit tests, 11 integration tests, five real-Keycloak E2E flows, and all three production builds for commit `ba3c76b` in 2m14s. Railway production deployments `41d719af-0663-41f6-8264-135e0aeb5e7d` (API), `5a061b21-07ec-41ff-8bfb-97b52014abd0` (web), and `35114d6c-fde5-4de6-9502-19e6ce6f2f3f` (Keycloak) succeeded for that commit; the public web proxy returned `{"status":"ok"}` from `/api/health`, and Keycloak realm discovery returned the exact production issuer, token endpoint, and JWKS URI.
- GitHub CI run `33631508200` passed every gate for the in-app tutorial; Railway API, web, and Keycloak deployments succeeded, both PostgreSQL services remained healthy, and the production proxy returned `{"status":"ok"}` from `/api/health`.
- Admin dashboard UI: web typecheck, lint, production build passed; CSS and React component updates adopted a modern admin-dashboard aesthetic with status badges, summary stats cards, improved visual hierarchy, and responsive layout based on Railway/Expo.dev patterns; all existing Playwright flows and four real-Keycloak E2E flows passed.
- Authenticated content shell: web typecheck, lint, nine component tests, production build, and all five real-Keycloak Playwright flows passed. The first E2E attempts were environmentally blocked by an occupied preview port and a stopped local Keycloak service; the same-repository preview was rebuilt with test identity settings, isolated local services were started, and the final real-login run passed.

## Next steps

- Design a future recursive Project JSON export contract for portable Project metadata, nested work items, acceptance criteria, dependencies, and deliberately selected related history.
- Queue one harmless real production Work Package and verify live heartbeat, claim, lifecycle callbacks, and the browser flow; do not use the simulator against production.
- Unlock the final Codex tutorial step only after that real Codex worker acceptance succeeds.

## Change log

### Visual references for MIRIAM

- Added an accessible Feature file picker for up to three PNG, JPEG, or WebP screenshots of at most 3 MB each, with Formik/Yup validation and browser-flow coverage.
- Validates file metadata and image signatures at the API/domain boundary, persists ordered bytes in PostgreSQL, and exposes only metadata in the Feature creation response.
- Delivers references in the claimed Work Package and materializes them as mode-`0600` temporary files for repeatable Codex `--image` arguments; base64 content is replaced with attachment metadata in the prompt and the existing executor cleanup removes the files.
- Migration `20260902173000_work_item_visual_references` creates the cascade-owned `VisualReference` table and ordered lookup index. Recovery is to preserve/export any required reference bytes before dropping that table; no rollback was performed.
- The feature changes 150 product-code lines; tests, documentation, and configuration are excluded from the 228-line limit.

### Bounded authenticated content shell

- Wrapped authenticated route content in the semantic main landmark so the existing centered width and responsive padding apply consistently to Projects, Work Items, execution history, and agent setup.
- Added component coverage for the main landmark and browser coverage that rejects an edge-to-edge desktop Project/Feature flow.
- Made reuse of an existing Playwright preview explicit for local diagnostics while retaining fresh-server behavior by default.
- The feature changes 6 product-code lines; tests, test configuration, and documentation are excluded from the 228-line limit.

### Protected production action approval

- Added an explicit Start Work checkbox for reviewed production data, authentication, infrastructure, cost, or public-access changes; unchecked remains the safe default.
- Persists the approval on the immutable execution attempt, includes it in the audit metadata and Work Package, and instructs Codex to stop if an unapproved protected action emerges.
- Added a fail-closed worker preflight for production database/schema work, destructive SQL, credentials/identity, DNS/infrastructure, billing, and repository visibility changes.
- Migration `20260902143000_execution_protected_action_approval` adds one non-null Boolean with a `false` default, so existing jobs remain unapproved. Production now contains the applied migration.
- The feature changes 52 product-code lines; tests, documentation, and generated/configuration files are excluded from the 228-line limit. The worker service is now enabled and running; production queue was empty during preflight.

### Production Codex worker lifecycle

- Added sequential heartbeat/discovery/claim/start execution with exact repository allowlisting and one active Codex run at a time.
- Validates each expected test and acceptance criterion exactly once before reporting Unit, Integration, deployment, E2E, and completion evidence in API-required order.
- Converts any post-claim execution or validation error into an idempotent terminal failure while preserving the original service-log error.
- Added continuous background heartbeat, resilient polling, signal-aware shutdown, focused success/empty/fail-closed tests, and a hardened user-service template.
- The feature changes 142 product-code lines; tests, service/configuration, and documentation are excluded from the 228-line limit.

### Production Codex executor

- Added a dedicated strict-TypeScript worker workspace and an argument-safe non-interactive Codex execution adapter.
- Uses ephemeral `workspace-write` runs, the selected Work Package model, a two-hour timeout, a private temporary JSON schema/result boundary, and guaranteed temporary-file cleanup.
- Rejects malformed tests, deployment metadata, and acceptance evidence rather than allowing an execution to appear successful.
- Added focused unit coverage for exact CLI constraints and fail-closed evidence parsing; real job claiming and lifecycle callbacks remain in the next feature slice.
- The feature adds 106 product-code lines; tests, manifests, Docker/configuration, and documentation are excluded from the 228-line limit.

### Shared machine API client

- Extracted the machine HTTP client, full Work Package contract, and cached OIDC client-credentials provider into a production-neutral workspace for use by both real and simulated workers.
- Kept the simulator lifecycle isolated and moved its HTTP/token boundary coverage with the shared code.
- Updated reproducible Docker dependency stages and the repository integration gate for the added workspace.
- The refactor changes 18 product-code lines in the rename-aware push diff; tests, manifests, lockfiles, Docker configuration, and documentation are excluded from the 228-line limit.

### OIDC polling-agent authentication and heartbeat

- Added a client-credentials token provider that form-encodes credentials, validates the response, caches tokens until the pre-expiry refresh window, and never logs the client secret or token.
- The simulator now accepts OIDC token URL/client ID/client secret settings, retains an already-issued static token for isolated testing, and heartbeats the node before each discovery poll.
- Added focused token/cache and lifecycle tests plus an actual localhost HTTP-boundary integration covering token acquisition, bearer authorization, heartbeat, discovery, and API error mapping.
- Unlocked the tutorial's machine-identity step with the exact external-secret environment workflow, retained the real-worker step as unavailable, and aligned the shared-automation instruction with official OpenAI service-account guidance.
- The feature changes 73 product-code lines; tests and documentation are excluded from the 228-line limit. A real node-scoped Keycloak client and real Codex worker remain intentionally unprovisioned and unverified.

### In-app agent setup tutorial

- Added an authenticated Connect Agent route and primary-navigation link instead of relying on repository documentation for user onboarding.
- Added a provider-neutral selection surface with an actionable Codex checklist and clearly disabled Claude/Grok future states.
- Persisted completed preparation steps locally, linked official OpenAI service-account guidance, warned against credential disclosure, and kept unavailable machine-identity/worker steps visibly locked.
- Added component and real-Keycloak browser coverage for the route, future-provider states, checklist interaction, and reload persistence.

### Codex execution target provisioning

- Added an idempotent API-side command that provisions a Codex-capable execution node, the installed Codex CLI version, and its remote default-model selection as separate registry records.
- Kept the node Offline until a real heartbeat, retained stable registry IDs on metadata refresh, and disabled superseded Codex CLI agent versions.
- Added input-validation unit coverage, real PostgreSQL adapter coverage, and documented the no-secret operational command.
- Deployed the command through Railway and idempotently provisioned the offline production MIRIAM/Codex CLI 0.152.0 target; no credential or new paid resource was created.

### Execution-node heartbeat

- Added a node-scoped machine API heartbeat that rejects a mismatched worker identity or disabled/missing node.
- Persisted the heartbeat timestamp and derived Online or Busy status from the node's reserved job count.
- Covered CQRS dispatch with a focused unit test and the authenticated HTTP/PostgreSQL behavior with integration assertions.

### Railway PITR decommission

- Disabled point-in-time recovery on the separate application and Keycloak PostgreSQL services to remove unneeded early-stage recovery storage expense.
- Applied the standalone database configuration changes one at a time; both Railway deployments succeeded before the next service was changed.
- Verified both services report PITR disabled and no bucket wired, no production buckets are deployed, and the production API plus Keycloak realm discovery remain healthy.
- Preserved both database services and persistent volumes; this change removes recovery storage and restore capability, not live data.
- No product-code lines changed; this is Railway infrastructure state plus documentation only.

### Cohesive authenticated navigation styling

- Reworked the authenticated shell into an accessible primary navigation with a branded Project link, username context, and an outlined sign-out action that shares the application's dark visual language.
- Added shared link, primary/secondary action, hover, and keyboard-focus states, plus responsive stacking for narrow screens; the public sign-in and project call-to-action now use the same controls.
- Added component coverage for navigation semantics and logout behavior, and extended the real-Keycloak browser flow to verify the primary navigation remains available through Project and WorkItem links.
- The feature changes 22 product-code lines; tests and documentation are excluded from the 228-line limit.

### Railway production topology and CI

- Created the five-service `giga-desk` Railway project from `conorbrown-dev/giga-desk@main` with isolated application/identity databases, private service references, generated credentials, exact public domains, and successful API/web/Keycloak deployments.
- Provisioned and read back the production Keycloak realm, scoped roles, required-PKCE client, audience mapper, and initial user; live browser acceptance persisted a production Project and Feature.
- Enabled continuous PITR with dedicated backup buckets and healthy WAL archivers for both PostgreSQL services; retained schedules and labeled backups remain blocked only by Railway OAuth consent.
- Added a GitHub Actions workflow mirroring the repository's required local gates against PostgreSQL and real Keycloak.
- Corrected the first CI run's empty-database failure by applying committed Prisma migrations before integration and E2E verification.
- No product-code lines changed; workflow, deployment, identity, and documentation configuration are excluded from the 228-line limit.

### Production container startup hardening

- Excluded generated Prisma sources from Docker context and regenerated the client after application source/config copy, making local builds reproduce Git/Railway build inputs and preserving `.js` ESM imports in compiled output.
- Added a Keycloak augmentation stage with PostgreSQL, health, and metrics enabled before optimized production startup.
- Added disposable-container proof for the compiled Prisma import and Keycloak persisted optimized configuration.
- No product-code lines changed; Docker, Prisma generator, and documentation configuration are excluded from the 228-line limit.

### Polling-first agent simulator

- Added a separate strict-TypeScript Node workspace that depends only on the public machine HTTP contracts rather than API implementation details.
- Polls one registered node, claims the oldest queued job, retrieves its Work Package, and submits simulated progress, Unit/Integration evidence, staging deployment, E2E evidence, and exact-criterion completion.
- Uses deterministic job/stage idempotency keys, abortable polling, an injected short-lived bearer token, and no source-controlled credentials; documentation explicitly prohibits production use because evidence is synthetic.
- Added focused lifecycle tests plus a real localhost HTTP-boundary integration test for machine authorization and error mapping.
- The feature adds 131 product-code lines; tests, documentation, package manifests, lockfiles, and tool configuration are excluded from the 228-line limit.

### Keycloak authentication and production packaging

- Replaced the local bearer-token bypass with a real Keycloak realm and authorization-code browser login using S256 PKCE; access tokens remain in the Keycloak adapter rather than browser storage.
- Maps only known Giga Desk realm roles to API permissions, preserves issuer/audience/signature validation, and filters unrelated Keycloak roles.
- Added real-login component, integration, and browser coverage plus reproducible local Keycloak/PostgreSQL services and a complete demo user profile.
- Added separate production API, web/Caddy, and Keycloak images with a documented five-service Railway topology and independent application/identity databases.
- The authentication feature changes 173 product-code lines; tests, documentation, dependency manifests, launcher code, realm configuration, and deployment configuration are excluded from the 228-line limit.

### Superseded guarded local showcase mode

- This earlier local bearer-token shortcut was removed by the Keycloak authentication feature; invalid tokens remain 401 and no production/demo bypass exists.
- Its Vite API proxy and launcher were retained, but the launcher now starts a real isolated Keycloak realm and login flow.

### Browser Feature creation

- Added a Formik/Yup Feature form on Project work-item pages with title, description, and newline-separated acceptance criteria.
- Maps criteria into the backend's structured array contract, reports authorization/missing-Project failures, resets after success, and refreshes the WorkItem projection.
- Added component and E2E coverage for validation, exact payload mapping, persistence refresh, and visible outcomes.
- The feature changes 35 product-code lines; tests and documentation are excluded from the 228-line limit.

### Browser Project creation

- Added a Formik/Yup Project form with backend-aligned key, name, description, and business-goal validation.
- Uses the authenticated Project creation API, reports duplicate-key/authorization failures, resets after success, and refreshes the portfolio.
- Added component and E2E coverage for validation, exact payload mapping, and immediate navigation to the new Project.
- The feature changes 41 product-code lines; tests and documentation are excluded from the 228-line limit.

### Authenticated Start Work controls

- Added a Formik/Yup Start Work form to the WorkItem execution page with accessible required-field feedback and submission states.
- Loads the authenticated execution registry, hides unavailable nodes, narrows model options to providers supported by the selected agent, and resets stale model selections when the agent changes.
- Queues the selected node/agent/model through the existing authenticated API, reports authorization/conflict failures, and refreshes execution history after success.
- Added component and browser coverage for validation, exact request payloads, successful queuing, and concurrent/incompatible selection conflicts.
- The feature changes 76 product-code lines; tests and documentation are excluded from the 228-line limit.

### Authenticated project and work-item navigation

- Replaced the placeholder Project route with authenticated Project summaries and explicit loading, error, and empty states.
- Added a Project work-items route with status, priority, acceptance-criterion progress, and direct links to WorkItem execution history.
- Added a typed frontend project API boundary and behavior-focused component/E2E coverage for the complete navigation path.
- Excluded ignored compiled `dist` output from API Vitest discovery so unit/integration results are independent of build order; corrected verification covers 17 unit and eight integration source files rather than counting stale compiled health-test duplicates.
- The feature changes 69 product-code lines; tests, documentation, and test configuration are excluded from the 228-line limit.

### Deployment callbacks and E2E transition

- Added node-scoped `POST /api/agent/jobs/{jobId}/deployment` with typed environment and deployment states.
- Deployment is rejected until the latest Unit and Integration results both pass.
- Callbacks persist Project/WorkItem/Execution-linked deployment evidence and deduplicate job-scoped retries.
- Successful deployment moves job and WorkItem to E2E Testing; failure/rollback marks the job Failed, blocks the WorkItem, and releases reserved node capacity.
- Added focused deployment-gate coverage and PostgreSQL-backed HTTP coverage for test gates, idempotency, evidence, and E2E transition.
- The feature adds 123 product-code lines plus focused controller/module edits, below the 228-line limit.
- Test cleanup now deletes restrictive Deployment fixtures before jobs and remains scoped to IDs created by the current run; broad stale-fixture cleanup was intentionally rejected.

### Automated test-result callbacks

- Added node-scoped `POST /api/agent/jobs/{jobId}/tests` with typed Unit/Integration/EndToEnd and Passed/Failed evidence.
- Unit and Integration results are accepted during Running/Testing and move implementation into Testing; E2E is rejected until the deployment phase.
- Test callbacks persist counts, failures, duration, artifact reference, audit metadata, and job-scoped idempotency keys; retries return the original result.
- Added a direct InProgress-to-Testing automation transition while retaining the review path for human/manual workflows.
- Added focused state coverage and PostgreSQL-backed HTTP coverage for transitions, idempotency, evidence, and early-E2E rejection.
- The feature adds 108 product-code lines plus focused controller/module/domain edits, below the 228-line limit.

### Execution start and progress callbacks

- Added node-scoped `POST /api/agent/jobs/{jobId}/start` and `/progress` callbacks for machine identities with `agent:jobs`.
- Start validates Assigned/Ready state and completed prerequisites, then atomically moves the job to Running, WorkItem to InProgress, timestamps both, and appends activities.
- Progress accepts only active execution states and deduplicates retries by job/idempotency key, returning the originally stored event even when retry payload text differs.
- Added focused execution-state coverage and PostgreSQL-backed HTTP coverage for node isolation, invalid states, transitions, audit history, and idempotency.
- The feature adds 133 product-code lines plus focused controller/module edits, below the 228-line limit.

### Execution evidence persistence

- Added ExecutionProgress, TestResult, and Deployment models linked to execution history; deployments also link directly to Project and WorkItem for operational views.
- Added typed Unit/Integration/EndToEnd, pass/fail, environment, and deployment-status enums.
- Added per-job idempotency uniqueness for progress, test, and deployment callbacks plus operational query indexes and nonnegative result metrics.
- Added and reviewed a 94-line generated migration plus a 4-line handwritten constraint migration, below the 228-line product-code limit.
- Expanded PostgreSQL integration coverage to prove evidence relations and retry deduplication.
- Rollback/recovery: remove dependent Deployment rows first, then TestResult and ExecutionProgress, before dropping the added enums; production rollback was not performed.

### Structured Work Package retrieval

- Added a node-scoped CQRS Work Package query for claimed active jobs at `GET /api/agent/jobs/{jobId}/work-package`.
- Returns project and repository context, WorkItem description/instructions/parent/criteria/dependencies, selected node/agent/model, and type-specific test/deployment expectations.
- Wrong-node and unclaimed/inactive access returns a non-revealing 404; machine permission and execution-node identity remain required.
- Added focused handler coverage and PostgreSQL-backed HTTP coverage for node isolation and the structured Feature execution contract.
- The feature adds 93 product-code lines plus focused controller/module edits, below the 228-line limit.

### Node-scoped job discovery and claim

- Extended verified principals with an optional execution-node claim while keeping human identities node-neutral.
- Added `GET /api/agent/nodes/{nodeId}/jobs` and `POST /api/agent/jobs/{jobId}/claim`, both requiring `agent:jobs` and a matching machine identity.
- Discovery returns the oldest 20 queued jobs for an enabled node through an explicit machine contract.
- Claiming is an atomic compare-and-set from Queued to Assigned and appends an attributed `ExecutionJobClaimed` activity; repeat/wrong-node claims are rejected.
- Added focused worker-scope coverage and PostgreSQL-backed HTTP coverage for discovery, claim, isolation, conflicts, and audit metadata.
- The feature adds 135 product-code lines plus focused authentication/module edits, below the 228-line limit.

### Start Work execution-job creation

- Added a CQRS command/handler and execution repository port for queuing a selected node, agent, and model against a WorkItem.
- Added `POST /api/work-items/{workItemId}/executions`, requiring `executions:create`, with strict UUID validation and stable 404/409 responses.
- Validates WorkItem state and dependencies, active-job absence, node availability/capacity, enabled targets, node capabilities, and agent/model provider compatibility.
- Atomically reserves node capacity, moves Backlog work to Ready, creates the queued job, and appends attributed execution/status activities.
- Added a partial unique index enforcing one nonterminal execution per WorkItem, closing concurrent duplicate requests at the database boundary.
- Added focused compatibility/handler tests and PostgreSQL-backed HTTP coverage for the complete Start Work behavior.
- The feature changes 227 product-code lines including migration and module wiring, below the 228-line limit.

### Authorized execution-target registry

- Added the execution bounded context with a CQRS registry query, Prisma read adapter, and `GET /api/execution/targets` transport requiring `executions:read`.
- Returns enabled nodes, agents, and models as explicit JSON-safe contracts while preserving node/agent/model separation.
- Excludes disabled nodes and records, orders each registry deterministically, and serializes heartbeat timestamps at the transport boundary.
- Added focused handler coverage and PostgreSQL-backed HTTP authentication, authorization, and projection coverage.
- The feature adds 106 product-code lines plus one application-module import, below the 228-line limit.

### Execution-domain persistence foundation

- Added separate ExecutionNode, Agent, AiModel, and ExecutionJob persistence models rather than collapsing host, runtime, and inference concerns.
- Added queued-through-terminal execution states, source-control/result metadata, registry uniqueness, WorkItem history relations, and operational indexes.
- Added database checks for positive node capacity, nonnegative job counts/retries, and positive optional model context windows.
- Added and reviewed a 115-line generated migration plus an 11-line handwritten constraint migration; the feature remains below the 228-line product-code limit.
- Added PostgreSQL-backed integration coverage for the complete WorkItem/node/agent/model/job relational graph.
- Avoided a known open Prisma `adapter-pg` deprecation path by separating relation-rich reads from writes; the focused trace run is clean.

### Controlled WorkItem status transitions

- Added a CQRS transition command/handler and a dedicated repository port for loading, prerequisite checks, and committing state.
- Added `PATCH /api/work-items/{workItemId}/status`, requiring `work-items:update`, with strict UUID/status validation and stable 404/409 responses.
- Starting `InProgress` is blocked while any dependency is unfinished.
- Prisma persistence uses a compare-and-set status predicate and appends `WorkItemStatusChanged` in the same transaction, preventing lost concurrent transitions.
- Added focused handler coverage plus PostgreSQL-backed HTTP coverage for authorization, invalid transitions, persistence, audit metadata, and missing items.
- The feature adds 138 product-code lines plus focused domain/module edits, below the 228-line limit.

### Project work-item read model

- Added a separate CQRS work-item query contract, handler, and Prisma projection adapter for Project board/detail consumers.
- Added `GET /api/projects/{projectId}/work-items`, requiring `projects:read`, with strict Project UUID validation and stable unknown-Project 404 behavior.
- Returns explicit hierarchy, type, status, priority, and ordered acceptance-criterion fields without exposing Prisma models.
- Added focused handler coverage and PostgreSQL-backed HTTP projection coverage.
- The feature adds 74 product-code lines plus small controller/module wiring edits, below the 228-line limit.

### Authenticated Feature creation

- Added a CQRS command/handler and write-repository port for creating a top-level Feature under a Project.
- Extended the domain invariant to reject blank acceptance criteria and normalize each criterion before persistence.
- Added `POST /api/projects/{projectId}/features`, requiring `work-items:create`, with strict DTO and UUID validation.
- Persists the Feature, ordered criteria, and attributed `FeatureCreated` activity in one Prisma transaction; unknown Projects map to a stable 404.
- Added focused handler/domain tests and PostgreSQL-backed HTTP coverage for authorization, validation, persistence, audit attribution, and missing parents.
- The feature adds 120 product-code lines plus focused domain/controller/module edits, below the 228-line limit.

### Authorized Project list query

- Added a separate CQRS query contract, handler, and Prisma read adapter instead of reusing the write repository.
- Added `GET /api/projects`, requiring `projects:read`, returning an explicit provider-independent projection ordered by recent activity.
- Excludes archived Projects and bounds the first read model to 50 records pending cursor pagination.
- Added focused query-handler coverage and PostgreSQL-backed HTTP authorization/projection coverage.
- Corrected persistence-test cleanup to remove dependency edges explicitly before deleting isolated Project fixtures.
- The feature adds 52 product-code lines plus small controller/module wiring edits, below the 228-line limit.

### Authenticated Project creation

- Added the first CQRS command and handler, keeping Project invariants in the framework-free domain object.
- Added a Prisma repository port/adapter and shared database module; runtime database configuration now fails closed when `DATABASE_URL` is absent.
- Added a validated `POST /api/projects` transport that derives the audit actor from the verified identity and requires `projects:create`.
- Maps duplicate keys to a stable 409 response without leaking Prisma errors; unknown request fields are rejected.
- Added focused handler coverage and PostgreSQL-backed HTTP integration coverage for authentication, authorization, validation, persistence, audit attribution, and conflicts.
- The feature adds 170 product-code lines plus small application wiring edits, below the 228-line limit.

### Provider-neutral API authentication

- Added a default-deny Nest guard with an explicit public-route decorator for health checks.
- Added strict bearer-token parsing and a JOSE verifier that requires RS256 signature, issuer, audience, subject, and configured remote JWKS validation.
- Added `/api/auth/me` as the authenticated identity boundary and preserved provider permissions without embedding provider-specific domain behavior.
- Added focused parsing tests, authenticated HTTP integration coverage, and a real signed-token/JWKS adapter integration test.

### Work-management persistence foundation

- Added PostgreSQL/Prisma configuration, a local Compose service, and the initial reviewed SQL migration.
- Added Project, WorkItem, AcceptanceCriterion, WorkItemDependency, and Activity persistence models with relational constraints and query indexes.
- Added framework-free Project and WorkItem domain validation plus focused unit coverage.
- Added a PostgreSQL integration test for hierarchy, criteria, dependencies, and structured activity metadata.
- Verified the migration state and persistence behavior against the healthy local PostgreSQL 17 container.

### Strict TypeScript application foundation

- Added npm workspaces for independently built NestJS and Vite/React applications.
- Added strict compiler rules, type-aware ESLint rules, Vitest unit/integration coverage, and Playwright E2E coverage.
- Added a minimal API health boundary and accessible routed frontend shell.
- Removed the unnecessary Nest scaffolding CLI after its transitive engine requirement exceeded the host Node patch; the API builds directly with TypeScript.
- Selected a host-compatible `jsdom` release and installed Playwright Chromium for local E2E execution.

### Repository architecture assessment

- Recorded the empty-template baseline and the initial modular-monolith, bounded-context, persistence, API, authentication, and delivery decisions.
- Confirmed there are no representative runtime features whose conventions can be reused.

### Platform CLI requirements

- Required the GitHub CLI for repository management, the Railway CLI for deployment and deployment troubleshooting, and the Cloudflare CLI for DNS, SSL, and tunnel management.
- Required installation from an official source when a necessary CLI is unavailable, plus authentication and target verification before remote changes.

### Initial template

- Added `AGENTS.md` with full-stack architecture, test, accessibility, code-quality, and push-scope rules.
- Added repository usage guidance and a pull-request checklist.
