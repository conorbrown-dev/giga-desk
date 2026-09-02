# 09 — Future Integrations and Autonomous Direction

## Future Integrations

Do not implement all of these in the first release, but avoid architectural decisions that would make them unnecessarily difficult:

- GitHub
- Azure DevOps
- GitLab
- Railway
- Azure
- AWS
- Docker
- OpenCode
- Codex CLI
- Ollama
- OpenAI API
- Anthropic API
- Slack
- email notifications
- CI/CD webhooks
- browser-based E2E agents

Document obvious extension points.

## AI-Assisted Work Refinement

Prepare the architecture for a future action such as **Prepare for Development**.

This action would turn an informal feature such as:

> Add a way for customers to reset their password.

into a structured implementation-ready specification containing:

- desired behavior;
- acceptance criteria;
- likely affected areas;
- edge cases;
- test expectations;
- unresolved questions.

Define a suitable domain/API boundary for this future capability.

Do not require real LLM integration for the first vertical slice unless the repository already contains appropriate AI infrastructure.

## Long-Term Autonomous Loop

The product should eventually support:

```text
Business Idea
      ↓
Project
      ↓
Feature
      ↓
AI-assisted refinement
      ↓
Development-ready specification
      ↓
Execution job
      ↓
AI coding agent
      ↓
Repository changes
      ↓
Automated tests
      ↓
AI/self review
      ↓
PR / merge
      ↓
Deployment
      ↓
E2E testing
      ↓
System callback
      ↓
Feature completed
      ↓
Next work item
```

Eventually multiple autonomous agents should be able to work on independent features within the same Project at the same time.

The architecture should allow this without requiring a redesign of Project, WorkItem, ExecutionJob, Agent, Model, or ExecutionNode concepts.

## Real Worker Integration After MVP

Once the simulated agent lifecycle is stable, the next major milestone should be connecting a real execution environment.

A likely first target is:

```text
Execution Node: MIRIAM
Agent: OpenCode
Model: local Qwen model
```

That integration should eventually support:

- node registration;
- heartbeat;
- capability reporting;
- job polling or dispatch;
- atomic job claiming;
- repository selection;
- launching the agent against the correct repository;
- passing the Work Package;
- capturing progress;
- capturing command/test results;
- source-control metadata;
- deployment metadata;
- E2E results;
- completion/failure callbacks;
- human-input requests.

A later worker could use Codex CLI or another agent without changing the core orchestration model.

## Autonomy Requirement for Codex

During implementation of this repository, Codex should continue until:

- the requested MVP is implemented;
- a genuine blocker is reached;
- credentials or external permissions are required;
- an unsafe/destructive production action would be required.

Do not repeatedly stop with messages like:

> The next step would be...

Perform the next reasonable step instead.

## Keep the First Release Operationally Simple

Do not add infrastructure merely because it might be useful later.

Prefer:

- existing database;
- existing application host;
- existing authentication;
- polling where sufficient;
- explicit domain concepts;
- simple deployment topology.

Introduce queues, distributed messaging, separate services, caching layers, or orchestration infrastructure only when a concrete requirement demonstrates the need.
