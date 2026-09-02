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
  await expect(navigation.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await page.getByRole('link', { name: 'View projects' }).click();
  await page.getByRole('link', { name: 'GD · Giga Desk' }).click();
  await page.getByRole('link', { name: 'Project navigation' }).click();
  await expect(page.getByText('No execution attempts yet.')).toBeVisible();
});

test('requires Keycloak authentication for project access', async ({ page }) => {
  await page.goto('/projects');
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Projects' })).not.toBeVisible();
});

test('validates selections and handles Start Work success and conflict', async ({ page }) => {
  let submissions = 0;
  await page.route('**/api/execution/targets', async (route) => route.fulfill({ json: {
    nodes: [{ id: 'node-1', name: 'Miriam', status: 'Online', maximumConcurrentJobs: 2, currentJobCount: 0 }],
    agents: [{ id: 'agent-1', name: 'Codex', version: '1.0', supportedModelProviders: ['OpenAI'] }],
    models: [{ id: 'model-1', displayName: 'GPT-5', provider: 'OpenAI', location: 'Remote' }],
  } }));
  await page.route('**/api/work-items/*/executions', async (route) => {
    if (route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toEqual({ executionNodeId: 'node-1', agentId: 'agent-1', modelId: 'model-1' });
      submissions += 1;
      await route.fulfill({ status: submissions === 1 ? 201 : 409, json: {} });
    } else await route.fulfill({ json: [] });
  });
  await signIn(page, '/work-items/work-1');
  await page.getByRole('button', { name: 'Start work' }).click();
  await expect(page.getByText('Choose an execution node.')).toBeVisible();
  await page.getByLabel(/Execution node/).selectOption('node-1');
  await page.getByLabel(/Agent/).selectOption('agent-1');
  await page.getByLabel(/Model/).selectOption('model-1');
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
      expect(route.request().postDataJSON()).toEqual({ key: 'RY', name: 'Ryan Demo', description: 'A browser showcase', businessGoal: 'Share working project planning' });
      projects = [{ id: projectId, key: 'RY', name: 'Ryan Demo', businessGoal: 'Share working project planning', status: 'Active', priority: 'Medium', updatedAt: '2026-09-01T00:00:00.000Z' }];
      await route.fulfill({ status: 201, json: {} });
    } else await route.fulfill({ json: projects });
  });
  await page.route('**/api/projects/*/features', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ title: 'Coworker showcase', description: 'Demonstrate feature planning', acceptanceCriteria: ['Project can be opened', 'Feature appears immediately'] });
    workItems = [{ id: 'work-10', parentId: null, type: 'Feature', title: 'Coworker showcase', status: 'Backlog', priority: 'Medium', criteria: [{ id: 'criterion-10', text: 'Project can be opened', satisfied: false, sortOrder: 0 }] }];
    await route.fulfill({ status: 201, json: {} });
  });
  await page.route('**/api/projects/*/work-items', async (route) => route.fulfill({ json: workItems }));
  await signIn(page, '/projects');
  await page.getByRole('button', { name: 'Add project' }).click();
  await expect(page.getByText('Enter a project key.')).toBeVisible();
  await page.getByLabel(/Project key/).fill('RY');
  await page.getByLabel(/Name/).fill('Ryan Demo');
  await page.getByLabel(/Description/).fill('A browser showcase');
  await page.getByLabel(/Business goal/).fill('Share working project planning');
  await page.getByRole('button', { name: 'Add project' }).click();
  await page.getByRole('link', { name: 'RY · Ryan Demo' }).click();
  await page.getByRole('button', { name: 'Add feature' }).click();
  await expect(page.getByText('Enter a feature title.')).toBeVisible();
  await page.getByLabel(/Title/).fill('Coworker showcase');
  await page.getByLabel(/Description/).fill('Demonstrate feature planning');
  await page.getByLabel(/Acceptance criteria/).fill('Project can be opened\nFeature appears immediately');
  await page.getByRole('button', { name: 'Add feature' }).click();
  await expect(page.getByRole('link', { name: 'Coworker showcase' })).toBeVisible();
});
