# Praxis Project Orchestrator — Codex Reference Pack

## Purpose

This reference pack defines the product, architecture, domain model, AI execution model, API contracts, UX expectations, engineering standards, testing strategy, and implementation sequence for a new system built from the existing `Praxis-Web-Template` repository.

The system is intended to combine the most useful ideas from Jira, Azure DevOps Boards, Trello, and GitHub Issues/Projects while adding a specialized capability: software-development work can be assigned to humans, development machines, local AI agents, or remote AI models and tracked through implementation, testing, deployment, E2E verification, and completion.

## Codex Instructions

Read these documents in numerical order before making major architectural decisions:

1. `01_PRODUCT_VISION_AND_MVP.md`
2. `02_DOMAIN_MODEL_AND_WORKFLOWS.md`
3. `03_AI_EXECUTION_ARCHITECTURE.md`
4. `04_AGENT_API_AND_PROTOCOL.md`
5. `05_UI_UX_AND_PROJECT_MANAGEMENT.md`
6. `06_SECURITY_RELIABILITY_AND_AUDIT.md`
7. `07_IMPLEMENTATION_PLAN_AND_ENGINEERING_STANDARDS.md`
8. `08_TESTING_VALIDATION_AND_DEFINITION_OF_DONE.md`
9. `09_FUTURE_INTEGRATIONS_AND_AUTONOMY.md`

## First Action

Before implementing functionality:

1. Inspect the entire `Praxis-Web-Template` repository.
2. Read its README and architecture documentation.
3. Identify the frontend, backend, persistence, authentication, authorization, validation, logging, testing, DI, API, deployment, and UI conventions already in use.
4. Inspect representative existing features before introducing new patterns.
5. Preserve the template's architecture and conventions unless there is a compelling technical reason not to.
6. Produce a short architecture assessment before making significant structural changes.

Do not generate a disconnected greenfield application inside the repository.

## Autonomy

Continue autonomously through the implementation sequence. Do not stop after each phase merely to explain what comes next.

You are authorized to:

- inspect the repository;
- create and modify files;
- make reasonable architectural decisions;
- write migrations;
- run local commands;
- write and run tests;
- debug failures;
- refactor your own changes;
- inspect diffs;
- update documentation.

When something fails:

1. investigate it;
2. determine the cause;
3. fix it;
4. rerun the relevant checks.

Stop only for a genuine blocker requiring information, credentials, or permissions that cannot reasonably be inferred from the repository, or for a destructive/external production action requiring explicit authorization.
