# 07 — Implementation Plan and Engineering Standards

## Implementation Strategy

Work iteratively and keep each phase integrated with the previous phases.

Do not make one uncontrolled repository-wide change.

### Phase 1 — Repository Analysis

Understand the template and produce a brief architecture assessment.

### Phase 2 — Domain Foundation

Implement:

- Projects
- WorkItems
- hierarchy
- relationships/dependencies
- acceptance criteria
- status transitions
- activity history
- persistence/migrations

### Phase 3 — Project Management UI

Implement:

- project list;
- project creation/editing;
- project detail;
- work-item creation/editing;
- board;
- work-item detail;
- list/table views.

### Phase 4 — Execution Domain

Implement:

- execution nodes;
- AI models;
- agents;
- execution jobs;
- work packages.

### Phase 5 — Start Work UX

Implement:

- execution selection;
- compatibility validation;
- execution-job creation.

### Phase 6 — Agent API

Implement:

- authentication;
- heartbeat;
- discovery;
- claim;
- work-package retrieval;
- progress;
- tests;
- deployment;
- E2E;
- completion;
- failure;
- human-input state.

### Phase 7 — Agent Simulator

Implement the complete simulated worker lifecycle.

### Phase 8 — Execution UI

Implement:

- execution dashboard;
- node management;
- agent/model management;
- execution/activity visibility.

### Phase 9 — Hardening

Address:

- authorization;
- validation;
- concurrency;
- idempotency;
- logging;
- errors;
- auditability.

### Phase 10 — Final Validation

Run the full quality gate and inspect the final diff.

## Engineering Standards

Follow these rules:

- preserve existing template architecture where appropriate;
- keep domain logic out of controllers/routes/components;
- keep components reasonably small;
- avoid duplicated business logic;
- use strong typing;
- avoid `any` or equivalent shortcuts unless unavoidable;
- avoid enormous service classes;
- avoid enormous React components;
- use clear naming;
- prefer explicit behavior over magic;
- do not prematurely introduce microservices;
- do not introduce unnecessary infrastructure;
- write migrations;
- write meaningful tests;
- run tests before declaring work complete;
- run lint/typecheck/build;
- inspect the final diff;
- remove dead or experimental code;
- update documentation.

## Architecture Goal

Prefer a modular monolith or the structure already implied by the template unless there is a strong reason to introduce additional deployment boundaries.

Avoid microservices for the initial release.

## Repository Conventions

Before creating a new pattern, inspect how the template already handles similar concerns such as:

- entities/domain objects;
- application services/use cases;
- persistence;
- HTTP APIs;
- DTOs/contracts;
- frontend data access;
- state management;
- forms;
- validation;
- authorization;
- tests.

Use existing conventions unless they conflict with a documented requirement.

## Development Seed Data

If consistent with the repository, add clearly marked development/demo seed data.

Example:

### Project

Praxis Studio

### Features

- Add customer dashboard
- Add password reset
- Add subscription management

### Execution Nodes

- MIRIAM
- Development Laptop
- Cloud Agent

### Models

- Local Qwen
- Codex
- Example Remote Model

Do not confuse development seed data with production defaults.

## Documentation

Add documentation covering:

### Architecture

- major domain concepts;
- bounded responsibilities;
- execution architecture;
- work-item workflow.

### Agent Protocol

See `04_AGENT_API_AND_PROTOCOL.md`.

### Local Development

Explain how to:

- start the application;
- create/update the database;
- run migrations;
- seed data;
- run tests;
- run the simulated agent;
- demonstrate the complete end-to-end workflow.
