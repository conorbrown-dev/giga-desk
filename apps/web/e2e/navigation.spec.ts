import { expect, test, type Page } from "@playwright/test";

const signIn = async (page: Page, path = "/"): Promise<void> => {
  await page.goto(path);
};

test("navigates from projects to a work item execution dashboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route("**/api/projects", async (route) =>
    route.fulfill({
      json: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          key: "GD",
          name: "Giga Desk",
          businessGoal: "Ship work reliably",
          status: "Active",
          priority: "High",
          updatedAt: "2026-09-01T00:00:00.000Z",
        },
      ],
    }),
  );
  await page.route("**/api/projects/*/work-items", async (route) =>
    route.fulfill({
      json: [
        {
          id: "00000000-0000-4000-8000-000000000002",
          parentId: null,
          type: "Feature",
          title: "Project navigation",
          status: "Ready",
          priority: "Medium",
          criteria: [],
        },
        {
          id: "00000000-0000-4000-8000-000000000004",
          parentId: "00000000-0000-4000-8000-000000000002",
          type: "UserStory",
          title: "Open a project backlog",
          status: "Backlog",
          priority: "High",
          criteria: [],
        },
      ],
    }),
  );
  await page.route("**/api/work-items/*/executions", async (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/execution/targets", async (route) =>
    route.fulfill({ json: { nodes: [], agents: [], models: [] } }),
  );
  await signIn(page);
  const navigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  await expect(
    navigation.getByRole("link", { name: "Giga Desk" }),
  ).toBeVisible();
  await expect(navigation.locator("img")).toHaveAttribute(
    "src",
    "/images/giga-desk-icon.png",
  );
  const accountControls = page.getByRole("navigation", {
    name: "Account controls",
  });
  await accountControls
    .getByRole("button", { name: "Open account menu for test-user" })
    .click();
  await expect(
    page.getByRole("menuitem", { name: /Account Settings/ }),
  ).toHaveAttribute("data-disabled");
  await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  await page.screenshot({
    path: "test-results/visual-review/account-menu-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/visual-review/account-menu-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await accountControls
    .getByRole("button", { name: "Open account menu for test-user" })
    .click();
  await page.getByRole("link", { name: "View projects" }).click();
  await expect(page.getByText("Production workspace")).toBeVisible();
  await expect(
    page.getByLabel("Projects").getByText("Active", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/visual-review/admin-dashboard-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({
    path: "test-results/visual-review/admin-dashboard-wide.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({
    path: "test-results/visual-review/admin-dashboard-tablet.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/visual-review/admin-dashboard-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "GD · Giga Desk" }).click();
  await expect(
    page.getByRole("region", { name: "Work at a glance" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Features and work items" }),
  ).toBeVisible();
  await expect(page.getByText("Project navigation")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Project navigation" }),
  ).not.toBeVisible();
  expect(
    await page
      .locator("body")
      .evaluate((body) => body.scrollWidth <= window.innerWidth),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/visual-review/project-backlog-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({
    path: "test-results/visual-review/project-backlog-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Open a project backlog" }).click();
  await expect(page.getByText("No execution attempts yet.")).toBeVisible();
});

test("renders an Auth0-configured protected project route", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/projects");
  await expect(page.getByRole("link", { name: "Giga Desk" })).toBeVisible();
  await page.screenshot({
    path: "test-results/visual-review/auth-brand-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/visual-review/auth-brand-mobile.png",
    fullPage: true,
  });
  await expect(
    page.getByRole("heading", { name: "Projects" }),
  ).not.toBeVisible();
});

test("switches between organization idea workspaces", async ({ page }) => {
  const consoleErrors: string[] = [];
  const coworkerIdeas = [
    {
      id: "idea-3",
      organizationId: "org-2",
      title: "Shared discovery calls",
      description: "Invite customers into structured discovery sessions.",
      status: "Open",
      createdBy: "user-2",
      createdAt: "2026-09-18T12:00:00.000Z",
      updatedAt: "2026-09-18T12:00:00.000Z",
      comments: [],
    },
  ];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.route("**/api/organizations", async (route) =>
    route.fulfill({
      json: [
        { id: "org-1", name: "Praxis Labs", members: [{ role: "Owner" }] },
        {
          id: "org-2",
          name: "Customer Council",
          members: [{ role: "Coworker" }],
        },
      ],
    }),
  );
  await page.route("**/api/organizations/org-1/ideas", async (route) =>
    route.fulfill({
      json: [
        {
          id: "idea-1",
          organizationId: "org-1",
          title: "Customer research board",
          description:
            "Bring stakeholder evidence together before project approval.",
          status: "Open",
          createdBy: "user-1",
          createdAt: "2026-09-17T12:00:00.000Z",
          updatedAt: "2026-09-18T12:00:00.000Z",
          comments: [
            {
              id: "comment-1",
              body: "Worth exploring",
              authorId: "user-2",
              createdAt: "2026-09-18T12:00:00.000Z",
            },
          ],
        },
        {
          id: "idea-2",
          organizationId: "org-1",
          title: "Retired proposal",
          description: "An archived idea remains available for context.",
          status: "Archived",
          createdBy: "user-1",
          createdAt: "2026-09-16T12:00:00.000Z",
          updatedAt: "2026-09-17T12:00:00.000Z",
          comments: [],
        },
      ],
    }),
  );
  await page.route("**/api/organizations/org-2/ideas", async (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toEqual({
        title: "Customer advisory group",
        description: "Validate demand before delivery begins.",
      });
      coworkerIdeas.unshift({
        ...coworkerIdeas[0],
        organizationId: "org-2",
        id: "idea-4",
        title: "Customer advisory group",
        description: "Validate demand before delivery begins.",
        status: "Open",
        comments: [],
        createdAt: "yesterday",
        createdBy: "Steve",
        updatedAt: "today",
      });
      await route.fulfill({ status: 201, json: coworkerIdeas[0] });
    } else await route.fulfill({ json: coworkerIdeas });
  });

  await signIn(page, "/ideas");
  await expect(
    page.getByRole("heading", { name: "Customer research board" }),
  ).toBeVisible();
  await expect(page.getByLabel("Idea summary")).toContainText(
    "Discussion posts1",
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({
    path: "test-results/visual-review/ideas-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({
    path: "test-results/visual-review/ideas-mobile.png",
    fullPage: true,
  });
  await page.getByLabel("Organization").selectOption("org-2");
  await expect(
    page.getByRole("heading", { name: "Shared discovery calls" }),
  ).toBeVisible();
  await expect(page.getByText("Coworker")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Add idea" }).click();
  await page.getByLabel("Title").fill("Customer advisory group");
  await page
    .getByLabel("Description")
    .fill("Validate demand before delivery begins.");
  await page.screenshot({
    path: "test-results/visual-review/create-idea-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({
    path: "test-results/visual-review/create-idea-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Create idea" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Idea “Customer advisory group” created.",
  );
  await expect(
    page.getByRole("heading", { name: "Customer advisory group" }),
  ).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test("archives a project only after its exact name is confirmed", async ({
  page,
}) => {
  const projectId = "00000000-0000-4000-8000-000000000003";
  await page.route("**/api/projects", async (route) =>
    route.fulfill({
      json: [
        {
          id: projectId,
          key: "GD",
          name: "Giga Desk",
          businessGoal: "Ship work reliably",
          status: "Active",
          priority: "High",
          updatedAt: "2026-09-01T00:00:00.000Z",
        },
      ],
    }),
  );
  await page.route(`**/api/projects/${projectId}/archive`, async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      projectName: "Giga Desk",
    });
    await route.fulfill({ status: 201, json: {} });
  });
  await signIn(page, `/projects/${projectId}/settings`);
  const confirmation = page.getByLabel(/Confirmation name/);
  await expect(
    page.getByRole("button", { name: "Archive project" }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({
    path: "test-results/visual-review/project-archive-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/visual-review/project-archive-mobile.png",
    fullPage: true,
  });
  await confirmation.fill("Giga desk");
  await expect(
    page.getByRole("button", { name: "Archive project" }),
  ).toBeDisabled();
  await confirmation.fill("Giga Desk");
  await page.getByRole("button", { name: "Archive project" }).click();
  await expect(page).toHaveURL(/\/projects$/);
});

test("does not require a legacy identity-provider page for browser tests", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/projects$/);
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/visual-review/auth0-test-mode-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/visual-review/auth0-test-mode-mobile.png",
    fullPage: true,
  });
});

test("walks through Codex agent setup in the authenticated app", async ({
  page,
}) => {
  await signIn(page, "/agents/connect");
  await expect(
    page.getByRole("heading", { name: "Connect an agent" }),
  ).toBeVisible();
  await expect(
    page.locator('[data-slot="card"]', { hasText: "Claude" }),
  ).toHaveAttribute("aria-disabled", "true");
  await expect(
    page.getByText(/installs a verified, versioned Giga Desk bundle/i),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Download Bash installer" }),
  ).toHaveAttribute("href", "/scripts/install-codex-worker.sh");
  await expect(
    page.getByRole("link", { name: "PowerShell installer" }),
  ).toHaveAttribute("href", "/scripts/install-codex-worker.ps1");
  await expect(
    page.getByText(/registers only its node-scoped target through the API/),
  ).toBeVisible();
  await expect(
    page.getByText(/The worker can come Online before project checkouts exist/),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Configure an approved checkout" }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Step completed" }).nth(3),
  ).toBeEnabled();
  await expect(
    page.getByRole("checkbox", { name: "Step completed" }).last(),
  ).toBeEnabled();
  await page.getByRole("checkbox", { name: "Step completed" }).first().click();
  await expect(page.getByLabel("1 of 5 setup steps complete")).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Step completed" }).first(),
  ).toBeChecked();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({
    path: "test-results/visual-review/codex-connect-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({
    path: "test-results/visual-review/codex-connect-wide.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: "test-results/visual-review/codex-connect-laptop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({
    path: "test-results/visual-review/codex-connect-tablet.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/visual-review/codex-connect-mobile.png",
    fullPage: true,
  });
});

test("shows only OpenCode setup when OpenCode is selected", async ({
  page,
}) => {
  await signIn(page, "/agents/connect");
  await page.getByRole("button", { name: /OpenCode/ }).click();
  await expect(
    page.getByRole("heading", { name: "Connect an OpenCode worker" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Machine setup" }),
  ).not.toBeVisible();
  await expect(page.getByText(/Install Codex CLI/)).not.toBeVisible();
  await expect(
    page.getByText(/registers through the authenticated API/),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Download Bash installer" }),
  ).toHaveAttribute("href", "/scripts/install-opencode-worker.sh");
  await expect(
    page.getByRole("link", { name: "PowerShell installer" }),
  ).toHaveAttribute("href", "/scripts/install-opencode-worker.ps1");
  await expect(
    page.getByText(/save its repository URL and local checkout path/),
  ).toBeVisible();
  await expect(
    page.getByText(/no Giga Desk source checkout is needed/i),
  ).toBeVisible();
  await expect(
    page.getByText(/The worker can come Online before project checkouts exist/),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Configure an approved checkout" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save repository mapping" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/visual-review/opencode-connect-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/visual-review/opencode-connect-mobile.png",
    fullPage: true,
  });
  await expect(page.getByText(/openai\/gpt-5/)).not.toBeVisible();
});

test("validates selections and handles Start Work success and conflict", async ({
  page,
}) => {
  let submissions = 0;
  await page.route("**/api/execution/targets", async (route) =>
    route.fulfill({
      json: {
        nodes: [
          {
            id: "node-1",
            name: "Miriam",
            status: "Online",
            maximumConcurrentJobs: 2,
            currentJobCount: 0,
            capabilities: {
              agentTypes: ["CodexCli"],
              modelProviders: ["OpenAI"],
            },
          },
        ],
        agents: [
          {
            id: "agent-1",
            name: "Codex",
            agentType: "CodexCli",
            version: "1.0",
            supportedModelProviders: ["OpenAI"],
          },
          {
            id: "agent-2",
            name: "OpenCode",
            agentType: "OpenCode",
            version: "1.0",
            supportedModelProviders: ["Ollama"],
          },
        ],
        models: [
          {
            id: "model-1",
            displayName: "GPT-5",
            provider: "OpenAI",
            location: "Remote",
          },
        ],
      },
    }),
  );
  await page.route("**/api/work-items/*/executions", async (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toEqual({
        executionNodeId: "node-1",
        agentId: "agent-1",
        modelId: "model-1",
        protectedActionsApproved: true,
      });
      submissions += 1;
      await route.fulfill({ status: submissions === 1 ? 201 : 409, json: {} });
    } else await route.fulfill({ json: [] });
  });
  await signIn(page, "/work-items/work-1");
  await page.getByRole("button", { name: "Start work" }).click();
  await expect(page.getByText("Choose an execution node.")).toBeVisible();
  await page.getByLabel(/Execution node/).selectOption("node-1");
  await expect(
    page.getByRole("option", { name: /OpenCode/ }),
  ).not.toBeAttached();
  await page.getByLabel(/Agent/).selectOption("agent-1");
  await page.getByLabel(/Model/).selectOption("model-1");
  await page
    .getByRole("checkbox", { name: "Approve protected production actions" })
    .click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({
    path: "test-results/visual-review/start-work-selection-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/visual-review/start-work-selection-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Start work" }).click();
  await expect(page.getByRole("status")).toHaveText("Execution queued.");
  await page.getByRole("button", { name: "Start work" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Work is already active or the selected targets are incompatible.",
  );
});

test("presents clear and retry as execution action buttons", async ({
  page,
}) => {
  let executions: readonly object[] = [
    {
      id: "job-1",
      status: "Failed",
      requestedAt: "2026-09-04T12:00:00.000Z",
      startedAt: "2026-09-04T12:01:00.000Z",
      completedAt: "2026-09-04T12:02:00.000Z",
      failureReason: "Agent lost its workspace",
      branchName: null,
      commitHash: null,
      pullRequestUrl: null,
      node: { id: "node-1", name: "Miriam" },
      agent: { id: "agent-1", name: "OpenCode", version: "1.18.26" },
      model: {
        id: "model-1",
        displayName: "Qwen 3 Coder Next",
        provider: "Ollama",
      },
      progress: [],
      tests: [],
      deployments: [],
    },
  ];
  await page.route("**/api/execution/targets", async (route) =>
    route.fulfill({ json: { nodes: [], agents: [], models: [] } }),
  );
  await page.route("**/api/work-items/*/executions/*/clear", async (route) => {
    executions = [];
    await route.fulfill({ status: 201, json: {} });
  });
  await page.route("**/api/work-items/*/executions/*/retry", async (route) =>
    route.fulfill({ status: 201, json: {} }),
  );
  await page.route("**/api/work-items/*/executions", async (route) =>
    route.fulfill({ json: executions }),
  );
  await signIn(page, "/work-items/work-1");
  const actions = page.getByRole("group", { name: "Execution actions" });
  await expect(
    actions.getByRole("button", { name: "Clear execution" }),
  ).toBeVisible();
  await expect(
    actions.getByRole("button", { name: "Retry execution" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({
    path: "test-results/visual-review/execution-actions-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/visual-review/execution-actions-mobile.png",
    fullPage: true,
  });
  await actions.getByRole("button", { name: "Clear execution" }).click();
  await expect(page.getByText("No execution attempts yet.")).toBeVisible();
});

test("streams activity and controls the registered worker process", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  let execution = {
    id: "426bb60b-8487-48a6-b3a8-048fdcec618a",
    status: "Running",
    requestedAt: "2026-09-04T14:01:59.619Z",
    startedAt: "2026-09-04T14:02:05.872Z",
    completedAt: null,
    failureReason: null,
    branchName: null,
    commitHash: null,
    pullRequestUrl: null,
    node: { id: "node-1", name: "Miriam" },
    agent: { id: "agent-1", name: "Codex CLI", version: "0.153.2" },
    model: { id: "model-1", displayName: "GPT-5", provider: "OpenAI" },
    tests: [],
    deployments: [],
    process: {
      id: 3019293,
      startedAt: "2026-09-04T14:02:06.000Z",
      terminationRequestedAt: null as string | null,
    },
    progress: [
      {
        phase: "Codex",
        message: "Analyzing the work item",
        createdAt: "2026-09-04T14:02:07.000Z",
      },
      {
        phase: "Repository",
        message: "Running a repository command",
        createdAt: "2026-09-04T14:02:09.000Z",
      },
    ],
  };
  await page.route("**/api/execution/targets", async (route) =>
    route.fulfill({ json: { nodes: [], agents: [], models: [] } }),
  );
  await page.route("**/api/work-items/*/executions/stream", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: `data: ${JSON.stringify([execution])}\n\n`,
    }),
  );
  await page.route(
    "**/api/work-items/*/executions/*/terminate",
    async (route) => {
      execution = {
        ...execution,
        process: {
          ...execution.process,
          terminationRequestedAt: "2026-09-04T14:03:00.000Z",
        },
      };
      await route.fulfill({
        status: 201,
        json: {
          terminationRequestedAt: execution.process.terminationRequestedAt,
        },
      });
    },
  );
  await page.route("**/api/work-items/*/executions", async (route) =>
    route.fulfill({ json: [execution] }),
  );
  await signIn(page, "/work-items/work-1");
  await expect(
    page.getByRole("region", { name: "Execution activity" }),
  ).toContainText("Running a repository command");
  await expect(page.getByText("Live")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Worker process" }),
  ).toContainText("PID 3019293");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({
    path: "test-results/visual-review/426bb60b-process-control-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Stop process" }).click();
  await page.screenshot({
    path: "test-results/visual-review/426bb60b-process-control-mobile.png",
    fullPage: true,
  });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page
    .getByRole("group", { name: "Confirm process termination" })
    .getByRole("button", { name: "Stop" })
    .click();
  await expect(
    page.getByRole("region", { name: "Worker process" }),
  ).toContainText("Stopping");
  expect(consoleErrors).toEqual([]);
});

test("creates a project, feature, and assignable work item in the browser", async ({
  page,
}) => {
  const projectId = "00000000-0000-4000-8000-000000000010";
  let projects: readonly object[] = [];
  let workItems: readonly object[] = [];
  await page.route("**/api/projects", async (route) => {
    expect(route.request().headers()["authorization"]).toMatch(/^Bearer /);
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toEqual({
        key: "RY",
        name: "Ryan Demo",
        description: "A browser showcase",
        businessGoal: "Share working project planning",
        repositoryUrl: "https://github.com/example/ryan-demo.git",
        defaultBranch: "main",
      });
      projects = [
        {
          id: projectId,
          key: "RY",
          name: "Ryan Demo",
          businessGoal: "Share working project planning",
          status: "Active",
          priority: "Medium",
          updatedAt: "2026-09-01T00:00:00.000Z",
        },
      ];
      await route.fulfill({ status: 201, json: {} });
    } else await route.fulfill({ json: projects });
  });
  await page.route("**/api/projects/*/features", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      title: "Coworker showcase",
      description: "Demonstrate feature planning",
      acceptanceCriteria: [
        "Project can be opened",
        "Feature appears immediately",
      ],
      visualReviewRequired: true,
      visualReferences: [
        {
          name: "expo.png",
          mediaType: "image/png",
          dataBase64: "iVBORw0KGgo=",
        },
      ],
    });
    workItems = [
      {
        id: "work-10",
        parentId: null,
        type: "Feature",
        title: "Coworker showcase",
        status: "Backlog",
        priority: "Medium",
        criteria: [
          {
            id: "criterion-10",
            text: "Project can be opened",
            satisfied: false,
            sortOrder: 0,
          },
        ],
      },
    ];
    await route.fulfill({ status: 201, json: {} });
  });
  await page.route("**/api/projects/*/features/*/work-items", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      title: "Configure the ORM",
      description: "Connect application persistence",
      acceptanceCriteria: ["Database client connects"],
      visualReviewRequired: false,
    });
    workItems = [
      ...workItems,
      {
        id: "story-10",
        parentId: "work-10",
        type: "UserStory",
        title: "Configure the ORM",
        status: "Backlog",
        priority: "Medium",
        criteria: [
          {
            id: "criterion-11",
            text: "Database client connects",
            satisfied: false,
            sortOrder: 0,
          },
        ],
      },
    ];
    await route.fulfill({ status: 201, json: {} });
  });
  await page.route("**/api/projects/*/work-items", async (route) =>
    route.fulfill({ json: workItems }),
  );
  await signIn(page, "/projects");
  const content = await page.getByRole("main").boundingBox();
  expect(content).not.toBeNull();
  expect(content?.width).toBeLessThanOrEqual(1200);
  expect(content?.x).toBeGreaterThan(0);
  await page.getByRole("link", { name: "Add project" }).click();
  await expect(page).toHaveURL(/\/projects\/new$/);
  await expect(
    page.getByRole("heading", { name: "Add project" }),
  ).toBeVisible();
  await page.getByLabel(/Project key/).fill("RY");
  await page.getByLabel(/Name/).fill("Ryan Demo");
  await page.getByLabel(/Description/).fill("A browser showcase");
  await page.getByLabel(/Business goal/).fill("Share working project planning");
  await page
    .getByLabel(/Repository URL/)
    .fill("https://user:secret@github.com/example/ryan-demo.git");
  await page.getByLabel(/Default branch/).fill("feature..invalid");
  await page.getByRole("button", { name: "Add project" }).click();
  await expect(page.getByText(/without credentials/)).toBeVisible();
  await expect(page.getByText("Enter a valid Git branch name.")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({
    path: "test-results/visual-review/project-repository-validation-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/visual-review/project-repository-validation-mobile.png",
    fullPage: true,
  });
  await page
    .getByLabel(/Repository URL/)
    .fill("https://github.com/example/ryan-demo.git");
  await page.getByLabel(/Default branch/).fill("main");
  await page.getByRole("button", { name: "Add project" }).click();
  await page.getByRole("link", { name: "RY · Ryan Demo" }).click();
  await page.getByRole("button", { name: "Add feature" }).click();
  await page.getByRole("button", { name: "Create feature" }).click();
  await expect(page.getByText("Enter a feature title.")).toBeVisible();
  await page.getByLabel(/Title/).fill("Coworker showcase");
  await page.getByLabel(/Description/).fill("Demonstrate feature planning");
  await page
    .getByLabel(/Acceptance criteria/)
    .fill("Project can be opened\nFeature appears immediately");
  await page.getByLabel(/Visual references/).setInputFiles({
    name: "expo.png",
    mimeType: "image/png",
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  });
  await page.getByRole("button", { name: "Create feature" }).click();
  await expect(page.getByText("Coworker showcase")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Coworker showcase" }),
  ).not.toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Add work item" }).click();
  await page.screenshot({
    path: "test-results/visual-review/create-work-item-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/visual-review/create-work-item-mobile.png",
    fullPage: true,
  });
  await page.getByLabel(/Title/).fill("Configure the ORM");
  await page.getByLabel(/Description/).fill("Connect application persistence");
  await page.getByLabel(/Acceptance criteria/).fill("Database client connects");
  await page.getByRole("button", { name: "Create work item" }).click();
  await expect(
    page.getByRole("link", { name: "Configure the ORM" }),
  ).toBeVisible();
});
