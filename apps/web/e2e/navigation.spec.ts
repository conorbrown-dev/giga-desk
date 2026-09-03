import { expect, test, type Page } from '@playwright/test';

const signIn = async (page: Page, path = '/'): Promise<void> => {
  await page.goto(path);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/realms\/giga-desk\//);
  await page.getByLabel('Username or email').fill('demo');
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('giga-desk-demo');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${path.replace('/', '\\/')}$`));
};

test('navigates from projects to a work item execution dashboard', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.route('**/api/projects', async (route) => route.fulfill({ json: [{
    id: '00000000-0000-4000-8000-000000000001', key: 'GD', name: 'Giga Desk', businessGoal: 'Ship work reliably',
    status: 'Active', priority: 'High', updatedAt: '2026-09-01T00:00:00.000Z',
  }] }));
  await page.route('**/api/projects/*/work-items', async (route) => route.fulfill({ json: [{
    id: '00000000-0000-4000-8000-000000000002', parentId: null, type: 'Feature', title: 'Project navigation',
    status: 'Ready', priority: 'Medium', criteria: [],
  }] }));
  await page.route('**/api/work-items/*/executions', async (route) => route.fulfill({ json: [] }));
  await page.route('**/api/execution/targets', async (route) => route.fulfill({ json: { nodes: [], agents: [], models: [] } }));
  await signIn(page);
  const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(navigation.getByRole('link', { name: 'Giga Desk' })).toBeVisible();
  await expect(navigation.locator('img')).toHaveAttribute('src', '/images/giga-desk-icon.png');
  await expect(navigation.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await page.getByRole('link', { name: 'View projects' }).click();
  await expect(page.getByText('Production workspace')).toBeVisible();
  await expect(page.getByLabel('Projects').getByText('Active', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/visual-review/admin-dashboard-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/visual-review/admin-dashboard-mobile.png', fullPage: true });
  await page.getByRole('link', { name: 'GD · Giga Desk' }).click();
  await page.getByRole('link', { name: 'Project navigation' }).click();
  await expect(page.getByText('No execution attempts yet.')).toBeVisible();
});

test('requires Keycloak authentication for project access', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/projects');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Giga Desk' })).toHaveAttribute('src', '/images/giga-desk-banner-logo.png');
  await page.screenshot({ path: 'test-results/visual-review/auth-brand-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/visual-review/auth-brand-mobile.png', fullPage: true });
  await expect(page.getByRole('heading', { name: 'Projects' })).not.toBeVisible();
});

test('uses the responsive Giga Desk theme for Keycloak sign in', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/projects');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/realms\/giga-desk\//);
  await expect(page).toHaveTitle('Sign in to Giga Desk');
  await expect(page.locator('link[href*="/login/giga-desk/css/login.css"]')).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Sign in to your account' })).toBeVisible();
  await page.screenshot({ path: 'test-results/visual-review/keycloak-login-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/visual-review/keycloak-login-mobile.png', fullPage: true });
});

test('walks through Codex agent setup in the authenticated app', async ({ page }) => {
  await signIn(page, '/agents/connect');
  await expect(page.getByRole('heading', { name: 'Connect a work agent' })).toBeVisible();
  await expect(page.getByText('Claude').locator('..')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByText(/downloads a verified worker bundle/i)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download Bash installer' })).toHaveAttribute('href', '/scripts/install-codex-worker.sh');
  await expect(page.getByRole('link', { name: 'Download PowerShell installer' })).toHaveAttribute('href', '/scripts/install-codex-worker.ps1');
  await expect(page.getByText(/registers only its node-scoped target through the API/)).toBeVisible();
  await expect(page.getByText(/The worker can come Online before project checkouts exist/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Configure a customer repository' })).toBeVisible();
  await expect(page.getByLabel('Step completed').nth(3)).toBeEnabled();
  await expect(page.getByLabel('Step completed').last()).toBeEnabled();
  await page.getByLabel('Step completed').first().check();
  await expect(page.getByText('1 of 5 complete')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Step completed').first()).toBeChecked();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: 'test-results/visual-review/codex-connect-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/visual-review/codex-connect-mobile.png', fullPage: true });
});

test('shows only OpenCode setup when OpenCode is selected', async ({ page }) => {
  await signIn(page, '/agents/connect');
  await page.getByRole('button', { name: /OpenCode/ }).click();
  await expect(page.getByRole('heading', { name: 'Connect an OpenCode worker' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Machine setup' })).not.toBeVisible();
  await expect(page.getByText(/Install Codex CLI/)).not.toBeVisible();
  await expect(page.getByText(/Registration happens through the authenticated API/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Download Bash installer' })).toHaveAttribute('href', '/scripts/install-opencode-worker.sh');
  await expect(page.getByRole('link', { name: 'Download PowerShell installer' })).toHaveAttribute('href', '/scripts/install-opencode-worker.ps1');
  await expect(page.getByText(/GIGA_DESK_WORKER_AGENT_TYPE=OpenCode/)).toBeVisible();
  await expect(page.getByText(/GIGA_DESK_WORKER_MODEL_IDENTIFIER=ollama\/qwen3-coder-next:q4_K_M/)).toBeVisible();
  await expect(page.getByText(/no Giga Desk source checkout is needed/i)).toBeVisible();
  await expect(page.getByText(/The worker can come Online before project checkouts exist/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Configure a customer repository' })).toBeVisible();
  await page.screenshot({ path: 'test-results/visual-review/opencode-connect-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/visual-review/opencode-connect-mobile.png', fullPage: true });
  await expect(page.getByText(/openai\/gpt-5/)).not.toBeVisible();
});

test('validates selections and handles Start Work success and conflict', async ({ page }) => {
  let submissions = 0;
  await page.route('**/api/execution/targets', async (route) => route.fulfill({ json: {
    nodes: [{ id: 'node-1', name: 'Miriam', status: 'Online', maximumConcurrentJobs: 2, currentJobCount: 0, capabilities: { agentTypes: ['CodexCli'], modelProviders: ['OpenAI'] } }],
    agents: [
      { id: 'agent-1', name: 'Codex', agentType: 'CodexCli', version: '1.0', supportedModelProviders: ['OpenAI'] },
      { id: 'agent-2', name: 'OpenCode', agentType: 'OpenCode', version: '1.0', supportedModelProviders: ['Ollama'] },
    ],
    models: [{ id: 'model-1', displayName: 'GPT-5', provider: 'OpenAI', location: 'Remote' }],
  } }));
  await page.route('**/api/work-items/*/executions', async (route) => {
    if (route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toEqual({ executionNodeId: 'node-1', agentId: 'agent-1', modelId: 'model-1',
        protectedActionsApproved: true });
      submissions += 1;
      await route.fulfill({ status: submissions === 1 ? 201 : 409, json: {} });
    } else await route.fulfill({ json: [] });
  });
  await signIn(page, '/work-items/work-1');
  await page.getByRole('button', { name: 'Start work' }).click();
  await expect(page.getByText('Choose an execution node.')).toBeVisible();
  await page.getByLabel(/Execution node/).selectOption('node-1');
  await expect(page.getByRole('option', { name: /OpenCode/ })).not.toBeAttached();
  await page.getByLabel(/Agent/).selectOption('agent-1');
  await page.getByLabel(/Model/).selectOption('model-1');
  await page.getByLabel('Approve protected production actions').check();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: 'test-results/visual-review/start-work-selection-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/visual-review/start-work-selection-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Start work' }).click();
  await expect(page.getByRole('status')).toHaveText('Execution queued.');
  await page.getByRole('button', { name: 'Start work' }).click();
  await expect(page.getByRole('alert')).toHaveText('Work is already active or the selected targets are incompatible.');
});

test('creates a project and adds a feature in the browser', async ({ page }) => {
  const projectId = '00000000-0000-4000-8000-000000000010';
  let projects: readonly object[] = [];
  let workItems: readonly object[] = [];
  await page.route('**/api/projects', async (route) => {
    expect(route.request().headers()['authorization']).toMatch(/^Bearer /);
    if (route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toEqual({ key: 'RY', name: 'Ryan Demo', description: 'A browser showcase', businessGoal: 'Share working project planning', repositoryUrl: 'https://github.com/example/ryan-demo.git', defaultBranch: 'main' });
      projects = [{ id: projectId, key: 'RY', name: 'Ryan Demo', businessGoal: 'Share working project planning', status: 'Active', priority: 'Medium', updatedAt: '2026-09-01T00:00:00.000Z' }];
      await route.fulfill({ status: 201, json: {} });
    } else await route.fulfill({ json: projects });
  });
  await page.route('**/api/projects/*/features', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ title: 'Coworker showcase', description: 'Demonstrate feature planning', acceptanceCriteria: ['Project can be opened', 'Feature appears immediately'], visualReviewRequired: true, visualReferences: [{ name: 'expo.png', mediaType: 'image/png', dataBase64: 'iVBORw0KGgo=' }] });
    workItems = [{ id: 'work-10', parentId: null, type: 'Feature', title: 'Coworker showcase', status: 'Backlog', priority: 'Medium', criteria: [{ id: 'criterion-10', text: 'Project can be opened', satisfied: false, sortOrder: 0 }] }];
    await route.fulfill({ status: 201, json: {} });
  });
  await page.route('**/api/projects/*/work-items', async (route) => route.fulfill({ json: workItems }));
  await signIn(page, '/projects');
  const content = await page.getByRole('main').boundingBox();
  expect(content).not.toBeNull();
  expect(content?.width).toBeLessThanOrEqual(1200);
  expect(content?.x).toBeGreaterThan(0);
  await page.locator('summary').filter({ hasText: 'Add project' }).click();
  await page.getByRole('button', { name: 'Add project' }).click();
  await expect(page.getByText('Enter a project key.')).toBeVisible();
  await page.getByLabel(/Project key/).fill('RY');
  await page.getByLabel(/Name/).fill('Ryan Demo');
  await page.getByLabel(/Description/).fill('A browser showcase');
  await page.getByLabel(/Business goal/).fill('Share working project planning');
  await page.getByLabel(/Repository URL/).fill('https://github.com/example/ryan-demo.git');
  await page.getByRole('button', { name: 'Add project' }).click();
  await page.getByRole('link', { name: 'RY · Ryan Demo' }).click();
  await page.locator('summary').filter({ hasText: 'Add feature' }).click();
  await page.getByRole('button', { name: 'Add feature' }).click();
  await expect(page.getByText('Enter a feature title.')).toBeVisible();
  await page.getByLabel(/Title/).fill('Coworker showcase');
  await page.getByLabel(/Description/).fill('Demonstrate feature planning');
  await page.getByLabel(/Acceptance criteria/).fill('Project can be opened\nFeature appears immediately');
  await page.getByLabel(/Visual references/).setInputFiles({ name: 'expo.png', mimeType: 'image/png',
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) });
  await page.getByRole('button', { name: 'Add feature' }).click();
  await expect(page.getByRole('link', { name: 'Coworker showcase' })).toBeVisible();
});
