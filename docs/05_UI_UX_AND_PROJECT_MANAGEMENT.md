# 05 — UI, UX, and Project Management

## UX Philosophy

The application should feel like a modern internal engineering tool.

It should be:

- fast;
- clean;
- understandable to business partners;
- useful to engineers;
- dense enough for real project work;
- easier to learn than Jira.

A non-engineer should be able to:

1. create a project;
2. describe an idea;
3. create a feature;
4. click Start Work;
5. select an execution target;

without understanding software-development process terminology.

Use progressive disclosure for advanced engineering information.

## Project Board

Create a Kanban-style board inspired by Trello, Jira, and Azure DevOps.

Support:

- status columns;
- drag-and-drop cards;
- filtering;
- work-item type indicators;
- priority;
- human assignee;
- execution target;
- tags;
- parent/child context;
- quick editing;
- work-item detail access;
- collapsed/expanded cards.

The board must not be the only view.

Also provide useful list/table views.

## Project Overview

A Project page should answer:

> What is happening with this project right now?

Include useful sections such as:

- project summary;
- project status;
- business goal;
- active work;
- backlog;
- blocked work;
- recently completed work;
- active agent executions;
- recent deployments;
- repository information;
- recent activity;
- meaningful progress indicators.

Avoid decorative or vanity metrics.

## Work Item Detail

Provide a comprehensive detail page containing:

- title;
- type;
- project;
- parent;
- children;
- description;
- acceptance criteria;
- status;
- priority;
- human assignee;
- execution assignment;
- technical notes;
- agent instructions;
- comments;
- activity history;
- dependencies;
- related work;
- branches;
- commits;
- pull requests;
- tests;
- deployments;
- execution history.

Use tabs or sections to keep the page manageable.

## Start Work UX

This is a primary interaction.

When the user selects **Start Work**, show a guided flow that allows the user to choose:

- human assignment;
- execution node;
- agent;
- AI model.

Where possible, only show compatible selections.

The interface should clearly explain what will execute the work without exposing unnecessary low-level configuration.

## Dashboard

Create a useful home dashboard with operational awareness.

Possible widgets:

- Active Projects
- Work In Progress
- Blocked Work
- Active AI Executions
- Machines Online
- Machines Offline
- Failed Executions
- Deployments Today
- Recently Completed Features
- Recently Updated Projects

Prioritize actionable information over decorative charts.

## Execution Dashboard

Create a dedicated AI/automation operations page showing:

- execution job;
- project;
- work item;
- execution node;
- model;
- agent;
- status;
- elapsed time;
- last update;
- latest progress message.

Support filtering by:

- queued;
- running;
- blocked;
- failed;
- completed.

The experience should resemble a lightweight CI/build operations dashboard.

## Machine / Node Management

Provide administrative UI for execution nodes.

Authorized users should be able to:

- register node;
- rename node;
- enable/disable node;
- inspect last heartbeat;
- inspect available agents;
- inspect available models;
- inspect active jobs;
- inspect execution history;
- revoke credentials.

## Agent and Model Management

Provide separate management screens for:

- AI providers;
- models;
- agents;
- execution capabilities.

Keep low-level AI administration separate from normal project-management screens.

## Search and Filters

Implement useful search across at least:

- projects;
- work items.

Support filters such as:

- project;
- work-item type;
- status;
- priority;
- assignee;
- execution node;
- agent;
- model;
- tag.

The architecture should allow comments and activity to become searchable later.

## Notifications

Prepare the architecture for notifications such as:

- execution failed;
- work blocked;
- deployment failed;
- E2E failed;
- human input required;
- feature completed.

Do not over-engineer external channels initially.

An in-app notification system is sufficient if no suitable notification abstraction already exists.

## Real-Time Updates

If reasonable for the existing stack, support real-time or near-real-time updates for:

- work-item state;
- execution progress;
- node heartbeat;
- deployment state.

For a .NET stack, SignalR may be appropriate.

Do not introduce real-time infrastructure if simple polling is more appropriate for the first vertical slice.
