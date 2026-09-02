# 01 — Product Vision and MVP

## Product Goal

Using the existing `Praxis-Web-Template` repository, build a system for tracking:

- projects;
- ideas;
- epics;
- features;
- user stories;
- tasks;
- bugs;
- issues;
- technical debt;
- research/spikes;
- development executions;
- tests;
- deployments;
- AI-driven software-development activity.

Borrow the strongest ideas from:

- Azure DevOps Boards;
- Jira;
- Trello;
- GitHub Issues / Projects.

Do not clone any one of them.

The system should remain much easier to use than Jira while still being useful to engineers.

## Primary Use Case

The users are business partners and software developers who regularly generate ideas that become software projects and work items.

Representative flow:

1. Ryan has an idea.
2. Ryan opens the web application.
3. He creates a Project.
4. He records the project's business purpose, goals, context, requirements, repository information, and other notes.
5. He creates a Feature.
6. The Feature may be decomposed into smaller work items.
7. Ryan clicks **Start Work**.
8. The application asks who or what should perform the work.
9. Ryan can choose:
   - a human;
   - a registered development machine;
   - an AI agent;
   - a machine plus an AI model;
   - eventually a cloud-hosted development agent.
10. The selected execution environment receives enough structured context to implement the work.
11. The agent updates progress as it works.
12. Code is created or modified.
13. Tests are written and executed.
14. The implementation is reviewed.
15. The application is deployed.
16. E2E tests run against the deployed system.
17. The executing AI system calls this application's API and reports completion.
18. The Work Item is closed only after its required completion conditions are satisfied.
19. Commit, branch, pull request, execution, test, deployment, and audit information remain attached to the work item.

The application is therefore the central source of truth for both:

- **what should be built**;
- **what humans and autonomous development systems are currently doing**.

## Product Boundaries

Treat the product as two closely related systems:

### Project / Work Management

Responsible for:

- projects;
- planning;
- work items;
- priorities;
- statuses;
- ownership;
- comments;
- dependencies;
- boards;
- dashboards;
- activity history.

### Development Orchestration

Responsible for:

- worker/development nodes;
- AI models;
- coding agents;
- execution jobs;
- job dispatch and claiming;
- machine heartbeats;
- work packages;
- progress updates;
- source-control metadata;
- tests;
- deployments;
- E2E verification;
- completion callbacks.

Keep these concepts integrated at the application level but separated cleanly in the architecture.

## MVP Vertical Slice

The first major milestone must support this complete scenario.

### Human Flow

1. User logs in.
2. User creates a Project.
3. User creates a Feature.
4. User adds description and acceptance criteria.
5. Feature appears on a project board.
6. User clicks **Start Work**.
7. User selects a registered execution node.
8. User selects an agent.
9. User selects an AI model.
10. System creates an Execution Job.

### Simulated Agent Flow

11. Simulated worker authenticates.
12. Worker discovers/retrieves the job.
13. Worker claims the job.
14. Worker retrieves a structured Work Package.
15. Worker reports execution started.
16. Worker posts progress updates.
17. Worker reports tests passing.
18. Worker reports deployment success.
19. Worker reports E2E success.
20. Worker marks the execution complete.

### System Behavior

21. Feature moves through its workflow.
22. All important actions are recorded.
23. Execution status is visible in the UI.
24. Deployment information is visible in the UI.
25. Feature automatically transitions to Completed only when its required completion conditions are satisfied.

## Simulated Agent First

Before integrating OpenCode, Codex CLI, Ollama, or another real coding runtime, implement a simulated worker or integration client that can exercise the full orchestration lifecycle:

```text
Get job
→ Claim job
→ Fetch work package
→ Start
→ Progress update
→ Test success
→ Deployment success
→ E2E success
→ Complete
```

The simulator may be:

- an integration test;
- a small CLI project;
- a small script;

Choose the option that best fits the existing repository.

This simulator establishes the contract that real AI workers will later use.
