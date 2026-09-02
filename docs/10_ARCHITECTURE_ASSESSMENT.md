# Architecture Assessment

## Repository Baseline

The repository is an intentionally unscaffolded Praxis Web template. It currently contains contributor policy, the project reference pack, and progress documentation; it has no runtime applications, package workspace, persistence schema, authentication implementation, deployment configuration, or representative features to extend.

## Required Foundation

- Use an npm workspace with separate `apps/web` and `apps/api` applications.
- Build a modular NestJS monolith whose feature modules follow domain, application, infrastructure, and interface boundaries.
- Keep the React application independently deployable and communicate with the backend only through explicit HTTP contracts.
- Use PostgreSQL through Prisma with real migrations; do not substitute production behavior with in-memory persistence.
- Keep project/work management and development orchestration as separate bounded contexts joined by identifiers and application use cases.
- Model `ExecutionNode`, `Agent`, `Model`, and `ExecutionJob` separately so execution is not coupled to a host or AI vendor.
- Begin machine execution with a polling-based, idempotent agent API and a simulator; defer queues and distributed infrastructure.

## Initial Decisions

- Use strict TypeScript throughout and repository-level scripts for typecheck, lint, unit, integration, E2E, and production builds.
- Use CQRS for explicit write commands and read queries while keeping business invariants in framework-free domain objects.
- Treat activity history and execution attempts as append-only audit records.
- Enforce completion requirements, job claiming, and callback idempotency transactionally at application and persistence boundaries.
- Add authentication and authorization as an explicit foundation before exposing human or machine operations. The empty template provides no mechanism that can safely be assumed or preserved.

## Delivery Constraints

Each implementation slice must be independently valid, include the required tests, update `progress.md`, and remain within the 228-line product-code push limit. No external deployment, DNS, credential, or paid-infrastructure action is part of the local foundation.
