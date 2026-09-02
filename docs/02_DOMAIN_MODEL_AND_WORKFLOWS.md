# 02 — Domain Model and Workflows

## Design Principle

Design the domain deliberately before creating persistence structures directly from UI screens.

Prefer explicit software-project concepts over a generic workflow engine.

Do not build a BPM platform with arbitrary nodes, arbitrary graphs, arbitrary entity definitions, or generic scripting unless a demonstrated future need requires it.

## Project

A Project represents a software product, internal tool, experiment, application, or initiative.

Suggested fields:

- Id
- Name
- Key / short identifier
- Description
- BusinessGoal
- Status
- Priority
- Owner
- CreatedBy
- CreatedAt
- UpdatedAt
- RepositoryUrl
- ProductionUrl
- StagingUrl
- DefaultBranch
- Tags
- Archived

Suggested statuses:

- Idea
- Planning
- Active
- On Hold
- Completed
- Archived

## Unified Work Item

Use a unified `WorkItem` concept where practical.

Supported types should include at least:

- Idea
- Epic
- Feature
- User Story
- Task
- Bug
- Issue
- Technical Debt
- Research / Spike

Do not require every project to use every hierarchy level.

Valid examples:

```text
Project → Feature → Task
```

or:

```text
Project → Epic → Feature → User Story → Task
```

Suggested fields:

- Id
- ProjectId
- Type
- Title
- Description
- Status
- Priority
- ParentWorkItemId
- AssignedUserId
- AssignedExecutionTargetId
- CreatedBy
- CreatedAt
- UpdatedAt
- StartedAt
- CompletedAt
- DueDate
- Estimate
- AcceptanceCriteria
- TechnicalNotes
- ImplementationInstructions
- Labels / Tags
- SortOrder

Keep the model extensible without turning it into an untyped metadata bag.

## Acceptance Criteria

Features, bugs, and stories should support structured, individually checkable acceptance criteria.

Example:

- User can create a project.
- User can create a feature within the project.
- Feature appears on the project board.
- Feature can be assigned to an execution target.
- Agent callback can update feature state.
- Completed feature displays deployment information.

AI agents should receive acceptance criteria as part of their execution context.

## Work Item Statuses

Start with a useful default workflow:

- Backlog
- Ready
- In Progress
- Blocked
- In Review
- Testing
- Ready for Deployment
- Deploying
- E2E Testing
- Completed
- Cancelled

Do not hard-code assumptions throughout the codebase that make future workflow customization difficult.

Every important status transition must create a historical activity record.

## Relationships

Support parent/child hierarchy and relationships such as:

- Parent Of
- Child Of
- Depends On
- Blocks
- Related To
- Duplicates

At minimum, implement:

- parent/child hierarchy;
- dependencies;
- blocked-by/blocks behavior.

Prevent or warn against starting work when unfinished prerequisites exist.

## Comments and Collaboration

Humans should be able to comment on work items.

Eventually agents should also be able to post comments.

Distinguish clearly between:

- human comments;
- agent comments;
- automated system events.

## Activity Timeline

Every meaningful action should create an immutable activity record.

Examples:

- Project created.
- Feature created.
- Status changed from Ready to In Progress.
- Work assigned to MIRIAM.
- OpenCode execution started.
- Qwen model selected.
- Branch created.
- Tests completed.
- Deployment started.
- Deployment succeeded.
- E2E tests passed.
- Work item completed.

Prefer structured event metadata where useful instead of storing only rendered free-form text.

## Deployments

A Deployment should track at least:

- Id
- ProjectId
- WorkItemId, when applicable
- ExecutionJobId
- Environment
- Version
- Commit
- StartedAt
- CompletedAt
- Status
- Url
- FailureReason

Suggested environments:

- Development
- Test
- Staging
- Production

Suggested statuses:

- Pending
- Running
- Succeeded
- Failed
- RolledBack

## Testing

Represent testing explicitly.

Support at least:

- Unit
- Integration
- End-to-End

Execution agents should be able to report:

- test type;
- result;
- test count, if known;
- failed tests;
- duration;
- artifact/log reference if relevant.

A successful deployment must not automatically imply work completion.

For deployable work, completion should normally require:

1. implementation complete;
2. required automated tests pass;
3. deployment succeeds;
4. required E2E validation passes.

Allow completion requirements to vary by work-item type so that research or non-deployable tasks do not require deployment.

## Human-in-the-Loop State

An execution may enter `WaitingForInput`.

An agent should be able to submit:

- a question;
- why it is blocked;
- relevant context;
- possible choices.

A human should be able to respond in the web application, after which the agent can retrieve the response and continue.
