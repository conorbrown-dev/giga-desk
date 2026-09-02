# 08 — Testing, Validation, and Definition of Done

## Testing Expectations

Implement meaningful behavioral tests rather than tests that simply mirror implementation details.

At minimum cover:

- project creation;
- feature creation;
- work-item hierarchy;
- dependencies;
- valid status transitions;
- invalid status transitions;
- execution-job creation;
- node/agent/model compatibility;
- job-claim concurrency;
- work-package generation;
- progress reporting;
- successful test reporting;
- failed test reporting;
- deployment success;
- deployment failure;
- E2E success;
- E2E failure;
- successful completion;
- failed execution;
- completion blocked when required tests have not passed;
- completion blocked when deployment fails;
- completion blocked when E2E tests fail;
- idempotent/retried callbacks;
- multiple execution attempts preserving history.

## Full Simulated-Agent Integration Test

Create a high-level integration test or executable scenario covering:

```text
Create Project
→ Create Feature
→ Start Work
→ Create Execution Job
→ Discover Job
→ Claim Job
→ Fetch Work Package
→ Start Job
→ Report Progress
→ Report Tests Passing
→ Report Deployment Success
→ Report E2E Success
→ Complete Job
→ Verify Feature Completed
→ Verify Activity History
→ Verify Execution History
→ Verify Deployment/Test Data
```

## Final Validation Checklist

Before considering the implementation complete:

1. Run backend tests.
2. Run frontend tests.
3. Run integration tests.
4. Run the simulated agent lifecycle.
5. Run type checking.
6. Run linting.
7. Run production builds.
8. Inspect migration output.
9. Inspect the full git diff.
10. Look specifically for:
   - duplicated logic;
   - security problems;
   - broken authorization;
   - race conditions;
   - incomplete error handling;
   - dead code;
   - placeholder UI;
   - unresolved TODOs;
   - inconsistent naming;
   - missing tests.
11. Fix problems found.
12. Repeat checks as necessary.

## Definition of Done — First Release

The first release is complete when this scenario can be demonstrated locally:

> Ryan logs into the application and creates a new software Project. He creates a Feature describing something he wants built and adds acceptance criteria. The Feature appears on the project board. He clicks Start Work and chooses MIRIAM, an available coding agent, and an available AI model. The system creates an execution job. A simulated external development agent authenticates to the API, claims the job, retrieves a structured work package, reports progress, reports passing automated tests, reports a successful deployment, reports successful E2E validation, and marks the execution complete. The Feature automatically transitions to Completed. Ryan can then open the Feature and see exactly what happened, including its execution history, activity timeline, testing information, and deployment information.

The real OpenCode/Codex/Ollama integration is not required for this first milestone, but replacing the simulator with a real worker should require minimal protocol changes.

## Final Report

When implementation is finished, provide a concise final report with these sections:

### Implemented

Major functionality completed.

### Architecture

Important design decisions and boundaries.

### Database

Major entities and migrations.

### Agent Protocol

How an external worker communicates with the system.

### UI

Major screens and workflows.

### Tests

Tests added and final results.

### Validation

Build, typecheck, lint, integration, and simulated-agent results.

### Deferred

Capabilities intentionally left for later.

### Recommended Next Step

The highest-value next integration will likely be connecting one real development execution environment, such as OpenCode running on MIRIAM, to the execution API.

Do not produce this report as a substitute for implementation.
