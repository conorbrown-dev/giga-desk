import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './app.js';
import type { AuthenticationState } from './auth-token.js';

describe('App', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });
  it('offers Keycloak sign in before protected routes render', () => {
    const login = vi.fn().mockResolvedValue(undefined);
    const authentication: AuthenticationState = { configured: true, authenticated: false, username: null, error: null, login, logout: vi.fn() };
    render(<MemoryRouter><App authentication={authentication} /></MemoryRouter>);
    expect(screen.getByRole('img', { name: 'Giga Desk' })).toHaveAttribute('src', '/images/giga-desk-banner-logo.png');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(login).toHaveBeenCalledOnce();
    expect(screen.queryByRole('heading', { name: 'Projects' })).not.toBeInTheDocument();
  });

  it('loads projects with authentication and links to their work items', async () => {
    localStorage.setItem('giga-desk-token', 'test-token');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([{
      id: 'project-1', key: 'GD', name: 'Giga Desk', businessGoal: 'Ship work reliably',
      status: 'Active', priority: 'High', updatedAt: '2026-09-01T00:00:00.000Z',
    }]) }));
    render(<MemoryRouter initialEntries={['/projects']}><App /></MemoryRouter>);
    expect(await screen.findByRole('link', { name: 'GD · Giga Desk' })).toHaveAttribute('href', '/projects/project-1');
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { name: 'Project Portfolio' }));
    expect(screen.getByText('Production workspace')).toBeInTheDocument();
    expect(screen.getByText('Active', { selector: '.status-chip' })).toHaveClass('status-positive');
    expect(screen.getByLabelText('Portfolio summary')).toHaveTextContent('High priority1');
    expect(fetch).toHaveBeenCalledWith('/api/projects', expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }));
  });

  it('provides primary navigation and signs out from the account action', () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    const authentication: AuthenticationState = { configured: true, authenticated: true, username: 'conor', error: null, login: vi.fn(), logout };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) }));
    render(<MemoryRouter initialEntries={['/projects']}><App authentication={authentication} /></MemoryRouter>);
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(navigation.querySelector('img')).toHaveAttribute('src', '/images/giga-desk-icon.png');
    expect(navigation).toHaveTextContent('conor');
    expect(screen.getByRole('link', { name: 'Giga Desk' })).toHaveAttribute('href', '/projects');
    expect(screen.getByRole('link', { name: 'Connect agent' })).toHaveAttribute('href', '/agents/connect');
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(logout).toHaveBeenCalledOnce();
  });

  it('guides Codex setup and remembers completed steps', () => {
    const view = render(<MemoryRouter initialEntries={['/agents/connect']}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Connect a work agent' })).toBeInTheDocument();
    expect(screen.getByText('Claude').closest('article')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: /OpenCode/ })).not.toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByText('Requires worker support')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download Bash installer' })).toHaveAttribute('href', '/scripts/install-codex-worker.sh');
    expect(screen.getByRole('link', { name: 'Download PowerShell installer' })).toHaveAttribute('href', '/scripts/install-codex-worker.ps1');
    expect(screen.getByText(/registers only its node-scoped target through the API/)).toBeInTheDocument();
    expect(screen.getByText(/install the included systemd user service/i)).toBeInTheDocument();
    expect(screen.getByText(/systemctl --user enable --now giga-desk-codex-worker.service/)).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')[3]).toBeEnabled();
    expect(screen.getAllByRole('checkbox')[4]).toBeEnabled();
    const firstStep = screen.getAllByRole('checkbox')[0];
    if (!firstStep) throw new Error('Expected a setup checkbox');
    fireEvent.click(firstStep);
    expect(screen.getByText('1 of 5 complete')).toBeInTheDocument();
    view.unmount();
    render(<MemoryRouter initialEntries={['/agents/connect']}><App /></MemoryRouter>);
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
  });

  it('shows only the selected provider setup', () => {
    render(<MemoryRouter initialEntries={['/agents/connect']}><App /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /OpenCode/ }));
    expect(screen.getByRole('heading', { name: 'Connect an OpenCode worker' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Machine setup' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Install Codex CLI/)).not.toBeInTheDocument();
    expect(screen.getByText(/Registration happens through the authenticated API/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Download Bash installer' })).toHaveAttribute('href', '/scripts/install-opencode-worker.sh');
    expect(screen.getByRole('link', { name: 'Download PowerShell installer' })).toHaveAttribute('href', '/scripts/install-opencode-worker.ps1');
    expect(screen.getByText(/GIGA_DESK_WORKER_AGENT_TYPE=OpenCode/)).toBeInTheDocument();
    expect(screen.getByText(/GIGA_DESK_WORKER_MODEL_IDENTIFIER=ollama\/qwen3-coder-next:q4_K_M/)).toBeInTheDocument();
    expect(screen.getByText(/systemctl --user restart giga-desk-codex-worker.service/)).toBeInTheDocument();
    expect(screen.queryByText(/openai\/gpt-5/)).not.toBeInTheDocument();
  });

  it('links project work items to execution history', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([{
      id: 'work-1', parentId: null, type: 'Feature', title: 'Navigate projects', status: 'Ready', priority: 'Medium',
      criteria: [{ id: 'criterion-1', text: 'Projects link to work', satisfied: false, sortOrder: 0 }],
    }]) }));
    render(<MemoryRouter initialEntries={['/projects/project-1']}><App /></MemoryRouter>);
    expect(await screen.findByRole('link', { name: 'Navigate projects' })).toHaveAttribute('href', '/work-items/work-1');
    expect(screen.getByText(/0 of 1 criteria complete/)).toBeInTheDocument();
  });

  it('creates a project and refreshes the portfolio', async () => {
    localStorage.setItem('giga-desk-token', 'test-token');
    let projects: readonly object[] = [];
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      if (input === '/api/projects' && init?.method === 'POST') {
        projects = [{ id: 'project-2', key: 'RY', name: 'Ryan Demo', businessGoal: 'Show the workflow', status: 'Active', priority: 'Medium', updatedAt: '2026-09-01T00:00:00.000Z' }];
        return Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(projects) });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter initialEntries={['/projects']}><App /></MemoryRouter>);
    fireEvent.click(screen.getByText('Add project', { selector: 'summary' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add project' }));
    expect(await screen.findByText('Enter a project key.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Project key/), { target: { value: 'RY' } });
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Ryan Demo' } });
    fireEvent.change(screen.getByLabelText(/Business goal/), { target: { value: 'Show the workflow' } });
    fireEvent.change(screen.getByLabelText(/Repository URL/), { target: { value: 'https://github.com/example/ryan-demo.git' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add project' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Project created.');
    expect(await screen.findByRole('link', { name: 'RY · Ryan Demo' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/projects', expect.objectContaining({ method: 'POST', body: JSON.stringify({ key: 'RY', name: 'Ryan Demo', description: '', businessGoal: 'Show the workflow', repositoryUrl: 'https://github.com/example/ryan-demo.git', defaultBranch: 'main' }) }));
  });

  it('creates a feature with structured criteria and refreshes the project', async () => {
    localStorage.setItem('giga-desk-token', 'test-token');
    let workItems: readonly object[] = [];
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => {
      if (input === '/api/projects/project-2/features' && init?.method === 'POST') {
        workItems = [{ id: 'work-2', parentId: null, type: 'Feature', title: 'Show Ryan the demo', status: 'Backlog', priority: 'Medium', criteria: [{ id: 'criterion-1', text: 'Project is visible', satisfied: false, sortOrder: 0 }] }];
        return Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({}) });
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(workItems) });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter initialEntries={['/projects/project-2']}><App /></MemoryRouter>);
    fireEvent.click(screen.getByText('Add feature', { selector: 'summary' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add feature' }));
    expect(await screen.findByText('Enter a feature title.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Show Ryan the demo' } });
    fireEvent.change(screen.getByLabelText(/Acceptance criteria/), { target: { value: 'Project is visible\nFeature is visible' } });
    fireEvent.change(screen.getByLabelText(/Visual references/), { target: { files: [new File([
      Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ], 'railway.png', { type: 'image/png' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Add feature' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Feature created.');
    expect(await screen.findByRole('link', { name: 'Show Ryan the demo' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/project-2/features', expect.objectContaining({ method: 'POST', body: JSON.stringify({ title: 'Show Ryan the demo', description: '', acceptanceCriteria: ['Project is visible', 'Feature is visible'], visualReviewRequired: true, visualReferences: [{ name: 'railway.png', mediaType: 'image/png', dataBase64: 'iVBORw0KGgo=' }] }) }));
  });

  it('shows an empty execution dashboard state', async () => {
    localStorage.setItem('giga-desk-token', 'test-token');
    vi.stubGlobal('fetch', vi.fn().mockImplementation((input: string) => Promise.resolve({ ok: true, json: () => Promise.resolve(input === '/api/execution/targets' ? { nodes: [], agents: [], models: [] } : []) })));
    render(<MemoryRouter initialEntries={['/work-items/00000000-0000-4000-8000-000000000001']}><App /></MemoryRouter>);
    expect(await screen.findByText('No execution attempts yet.')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith('/api/work-items/00000000-0000-4000-8000-000000000001/executions', expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }));
  });

  it('validates and queues a selected execution', async () => {
    localStorage.setItem('giga-desk-token', 'test-token');
    const fetchMock = vi.fn().mockImplementation((input: string, init?: RequestInit) => Promise.resolve({
      ok: true, status: 200, json: () => Promise.resolve(input === '/api/execution/targets' ? {
        nodes: [{ id: 'node-1', name: 'Miriam', status: 'Online', maximumConcurrentJobs: 2, currentJobCount: 0, capabilities: { agentTypes: ['CodexCli'], modelProviders: ['OpenAI'] } }],
        agents: [{ id: 'agent-1', name: 'Codex', agentType: 'CodexCli', version: '1.0', supportedModelProviders: ['OpenAI'] }],
        models: [
          { id: 'model-1', displayName: 'GPT-5', provider: 'OpenAI', location: 'Remote' },
          { id: 'model-2', displayName: 'Claude', provider: 'Anthropic', location: 'Remote' },
        ],
      } : init?.method === 'POST' ? {} : []),
    }));
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter initialEntries={['/work-items/work-1']}><App /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Start work' }));
    expect(await screen.findByText('Choose an execution node.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Execution node/), { target: { value: 'node-1' } });
    fireEvent.change(screen.getByLabelText(/Agent/), { target: { value: 'agent-1' } });
    expect(screen.queryByRole('option', { name: /Claude/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Model/), { target: { value: 'model-1' } });
    fireEvent.click(screen.getByLabelText('Approve protected production actions'));
    fireEvent.click(screen.getByRole('button', { name: 'Start work' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Execution queued.');
    expect(fetchMock).toHaveBeenCalledWith('/api/work-items/work-1/executions', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ executionNodeId: 'node-1', agentId: 'agent-1', modelId: 'model-1',
        protectedActionsApproved: true }),
    }));
  });

  it('filters incompatible agents and explains unavailable model selections', async () => {
    localStorage.setItem('giga-desk-token', 'test-token');
    vi.stubGlobal('fetch', vi.fn().mockImplementation((input: string) => Promise.resolve({ ok: true, json: () => Promise.resolve(input === '/api/execution/targets' ? {
      nodes: [{ id: 'node-1', name: 'Miriam', status: 'Online', maximumConcurrentJobs: 1, currentJobCount: 0, capabilities: { agentTypes: ['CodexCli'], modelProviders: ['OpenAI'] } }],
      agents: [{ id: 'agent-1', name: 'OpenCode', agentType: 'OpenCode', version: '1.0', supportedModelProviders: ['Ollama'] }], models: [{ id: 'model-1', displayName: 'Qwen', provider: 'Ollama', location: 'Local' }],
    } : []) })));
    render(<MemoryRouter initialEntries={['/work-items/work-1']}><App /></MemoryRouter>);
    const node = await screen.findByLabelText(/Execution node/);
    fireEvent.change(node, { target: { value: 'node-1' } });
    expect(screen.getByRole('alert')).toHaveTextContent('This execution node has no compatible agents.');
    expect(screen.getByLabelText(/Agent/)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Start work' })).toBeDisabled();
  });
});
