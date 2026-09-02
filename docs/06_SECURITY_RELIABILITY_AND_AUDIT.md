# 06 — Security, Reliability, and Audit

## Authorization

Respect the authentication and authorization mechanisms already present in `Praxis-Web-Template`.

Suggested roles or permission groups may include:

- Administrator
- Project Owner
- Contributor
- Viewer
- Agent / Service Account

Avoid scattered string comparisons for role names.

Prefer centralized policies or permissions if consistent with the template.

## Auditability

Because AI workers may eventually modify and deploy software, preserve a clear audit trail.

Record:

- who requested work;
- when work was requested;
- selected execution node;
- selected agent;
- selected model;
- state transitions;
- progress;
- source-control references;
- tests;
- deployments;
- failures;
- retries;
- completion.

Historical execution data must remain available after retries.

## Credentials

Machine/agent credentials must:

- never be committed to source control;
- be revocable;
- be rotatable;
- support scopes/permissions;
- be auditable.

Use the repository's existing secret/configuration strategy where available.

## Validation

Use existing validation patterns.

Validate at least:

- required fields;
- valid status transitions;
- parent-child relationships;
- dependency rules;
- execution-target availability;
- model availability;
- agent compatibility;
- execution ownership;
- completion requirements.

Return useful errors to both humans and machine clients.

## Error Handling

Use centralized error handling consistent with the template.

Agent APIs should return stable machine-readable errors.

Do not expose internal stack traces or secrets.

## Structured Logging

Use structured logging.

Execution-related log events should include identifiers such as:

- ProjectId
- WorkItemId
- ExecutionJobId
- ExecutionNodeId
- AgentId
- ModelId, when useful

Do not log credentials, API keys, access tokens, or other secrets.

## Persistence Requirements

Use the repository's actual persistence technology.

Do not use temporary in-memory persistence for production functionality unless the existing architecture explicitly relies on it.

Create real migrations.

Ensure appropriate use of:

- foreign keys;
- indexes;
- timestamps;
- audit information;
- concurrency controls;
- enum/value conversion conventions.

Avoid unnecessary over-normalization.

## Concurrency

Agent orchestration creates race conditions that must be handled intentionally.

At minimum:

- only one worker may claim a job;
- duplicate completion callbacks must be safe;
- retries must not duplicate deployments or important events;
- invalid concurrent transitions must be rejected.

Document the concurrency strategy.

## Safe Production Behavior

Do not perform destructive production actions without explicit authorization.

Do not:

- destroy production data;
- overwrite production databases;
- rotate real credentials;
- incur paid infrastructure costs;
- deploy to production unless an existing workflow clearly makes that expected and safe.

Where credentials or production integrations are unavailable, mock or simulate them while preserving the integration contracts.
