# 04 — Agent API and Protocol

## Purpose

Provide a secure machine-oriented API that allows external development workers to discover work, claim it, retrieve context, report execution state, report tests and deployments, and complete or fail jobs.

Use the existing API conventions in `Praxis-Web-Template`. Endpoint names below are conceptual examples only.

## Human-Facing API Examples

```text
/api/projects
/api/projects/{id}
/api/projects/{id}/work-items
/api/work-items/{id}
/api/work-items/{id}/comments
/api/work-items/{id}/start
```

## Agent-Facing API Examples

```text
/api/agent/nodes/{id}/heartbeat
/api/agent/jobs
/api/agent/jobs/{id}/claim
/api/agent/jobs/{id}/work-package
/api/agent/jobs/{id}/progress
/api/agent/jobs/{id}/tests
/api/agent/jobs/{id}/deployment
/api/agent/jobs/{id}/complete
/api/agent/jobs/{id}/fail
```

## Required Agent Capabilities

The protocol should support actions such as:

- register/update execution node;
- node heartbeat;
- retrieve assigned/available jobs;
- claim a job;
- retrieve work package;
- mark job started;
- update progress;
- create activity/log entries;
- report blocked/waiting-for-input state;
- report testing state;
- report test results;
- associate branch;
- associate commit;
- associate pull request;
- report deployment;
- report E2E result;
- complete job;
- fail job.

## Representative Lifecycle

```text
Worker polls or receives job
        ↓
Claims execution job
        ↓
Fetches work package
        ↓
Creates branch
        ↓
Agent implements work
        ↓
Runs tests
        ↓
Reports progress
        ↓
Creates PR / merges changes
        ↓
Deploys
        ↓
Runs E2E validation
        ↓
Reports successful deployment
        ↓
Marks execution complete
        ↓
Work item transitions to Completed
```

## Authentication

Do not expose agent APIs anonymously.

Use an authentication method appropriate to the existing application architecture, such as:

- scoped API keys;
- machine tokens;
- service identities;
- signed short-lived credentials.

Machine credentials should support:

- revocation;
- rotation;
- scoped permissions;
- audit history.

Never place secrets directly in source control.

## Idempotency

Machine APIs must be safe to retry.

Examples:

- repeated deployment-success callbacks must not create duplicate deployments;
- repeated completion calls must not corrupt state;
- network retries must not duplicate important events;
- progress retries should be deduplicated where appropriate.

Use idempotency keys, deterministic command identifiers, unique constraints, transactional checks, or another pattern consistent with the stack.

## Concurrency

Ensure that:

- two workers cannot claim the same execution job;
- claim operations are atomic;
- completion callbacks cannot race into invalid states;
- retries do not erase previous execution attempts.

Use optimistic concurrency, transactions, row-level locking, compare-and-set semantics, or another appropriate mechanism.

Document the chosen strategy.

## State Validation

Reject invalid transitions.

Examples:

- unclaimed job cannot report completion;
- failed tests should block completion when tests are required;
- failed deployment should block completion;
- failed E2E validation should block completion;
- disabled execution node cannot claim work;
- incompatible model/agent/node combinations must be rejected.

Return machine-readable error responses.

Do not leak stack traces.

## Source Control Metadata

Track provider-neutral source-control information where practical:

- repository;
- branch;
- commit;
- pull request;
- merge status.

GitHub may be the first provider, but domain behavior should not depend directly on GitHub-specific structures where an abstraction is simple and justified.

## Human Input Protocol

Support a job entering `WaitingForInput`.

An agent can submit:

- question;
- reason blocked;
- context;
- optional choices.

The application stores the request and displays it to the user.

A human response becomes available to the agent through the API so execution can resume.

## Documentation Requirement

Add developer documentation that explains:

1. authentication;
2. node registration/heartbeat;
3. job discovery;
4. claiming;
5. work-package retrieval;
6. progress reporting;
7. test reporting;
8. deployment reporting;
9. E2E reporting;
10. completion/failure;
11. human-input handling.

Include example request and response payloads.
