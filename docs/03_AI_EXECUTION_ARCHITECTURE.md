# 03 — AI Execution Architecture

## Key Architectural Separation

Treat these as separate concepts:

- **Execution Node** — where work runs.
- **Agent** — the coding/runtime behavior and tools.
- **Model** — the inference model used by the agent.

Example:

```text
Execution Node: MIRIAM
Agent: OpenCode
Model: Qwen3-Coder-Next
```

Another job might use:

```text
Execution Node: Cloud Worker
Agent: Codex CLI
Model: OpenAI model
```

Do not collapse these into one table or vendor-specific concept.

## Execution Node

Use an appropriately general term such as:

- ExecutionNode
- DevelopmentNode
- AgentHost
- WorkerNode

Avoid names that assume the target will always be a desktop machine.

Suggested fields:

- Id
- Name
- Description
- Hostname
- OperatingSystem
- Architecture
- Status
- LastHeartbeatAt
- Enabled
- Capabilities
- MaximumConcurrentJobs
- CurrentJobCount
- Tags

Suggested states:

- Online
- Offline
- Busy
- Degraded
- Disabled

Nodes should support heartbeat updates.

## AI Model Registry

Suggested fields:

- Id
- DisplayName
- Provider
- ModelIdentifier
- ModelType
- ContextWindow
- LocalOrRemote
- Enabled
- Capabilities
- Notes

Possible providers may later include:

- Ollama
- OpenAI
- Anthropic
- custom/local inference servers
- other provider adapters

Do not hard-code provider assumptions into domain logic.

## Agent Registry

An Agent provides behavior and tooling and is distinct from the inference model.

Examples:

- OpenCode
- Codex CLI
- custom Praxis coding agent
- another development runtime

Suggested fields:

- Id
- Name
- AgentType
- Version
- Enabled
- SupportedCapabilities
- Configuration
- SupportedModelProviders

## Execution Job

Starting AI-driven work must create an explicit execution record rather than only changing a work-item status.

Suggested fields:

- Id
- WorkItemId
- ExecutionTargetId
- AgentId
- ModelId
- RequestedBy
- RequestedAt
- StartedAt
- CompletedAt
- Status
- Result
- FailureReason
- RetryCount
- BranchName
- PullRequestUrl
- CommitHash
- DeploymentId

Suggested states:

- Queued
- Assigned
- Starting
- Running
- WaitingForInput
- Blocked
- Testing
- Reviewing
- Deploying
- E2ETesting
- Completed
- Failed
- Cancelled

A work item may have multiple execution attempts.

Never overwrite prior execution history when retrying work.

## Start Work Workflow

When a user clicks **Start Work**, allow execution by:

### Human

Assign to a registered user.

### Execution Node

Assign the work to a registered worker/development node.

### AI Agent

Select an available coding agent.

### Node + Agent + Model

Allow explicit selection of:

1. execution node;
2. coding agent/runtime;
3. AI model.

Validate compatibility among the selected node, agent, and model.

## Work Package

When an agent begins work, the system must produce a structured Work Package containing the context needed to execute the task.

Include:

- project name;
- project description;
- business goal;
- repository;
- default branch;
- work-item type;
- work-item title;
- work-item description;
- acceptance criteria;
- technical notes;
- implementation instructions;
- parent-work-item context;
- related work;
- dependencies;
- requested execution environment;
- expected tests;
- deployment expectations.

Expose this through a stable API contract.

## Progress Reporting

Agents should publish meaningful progress without producing excessive noise.

Examples:

- Inspecting repository
- Implementation plan created
- Database changes complete
- API implementation complete
- UI implementation complete
- Unit tests passing
- Integration tests passing
- Deployment started
- E2E tests running

Display the latest state on:

- the work-item page;
- an execution dashboard.

## Future Dispatch Model

The initial implementation may use polling.

Architect so push/event-driven dispatch can be added later without replacing the domain model.

Do not introduce Kafka, Redis, Kubernetes, or other infrastructure unless the first working version genuinely requires it.
