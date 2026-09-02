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
    expect(fetch).toHaveBeenCalledWith('/api/projects', expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }));
  });

  it('provides primary navigation and signs out from the account action', () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    const authentication: AuthenticationState = { configured: true, authenticated: true, username: 'conor', error: null, login: vi.fn(), logout };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) }));
    render(<MemoryRouter initialEntries={['/projects']}><App authentication={authentication} /></MemoryRouter>);
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(navigation).toHaveTextContent('conor');
    expect(screen.getByRole('link', { name: 'Giga Desk' })).toHaveAttribute('href', '/projects');
    expect(screen.getByRole('link', { name: 'Connect agent' })).toHaveAttribute('href', '/agents/connect');
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(logout).toHaveBeenCalledOnce();
  });

  it('guides Codex setup and remembers completed steps', () => {
    const view = render(<MemoryRouter initialEntries={['/agents/connect']}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Connect a work agent' })).toBeInTheDocument();
    expect(screen.getByText('Claude').closest('article')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getAllByText('Requires worker support')).toHaveLength(1);
    expect(screen.getAllByRole('checkbox')[3]).toBeEnabled();
    expect(screen.getAllByRole('checkbox')[4]).toBeDisabled();
    const firstStep = screen.getAllByRole('checkbox')[0];
    if (!firstStep) throw new Error('Expected a setup checkbox');
    fireEvent.click(firstStep);
    expect(screen.getByText('1 of 5 complete')).toBeInTheDocument();
    view.unmount();
    render(<MemoryRouter initialEntries={['/agents/connect']}><App /></MemoryRouter>);
    expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
  });

  it('links project work items to execution history', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([{
      id: 'work-1', parentId: null, type: 'Feature', title: 'Navigate projects', status: 'Ready', priority: 'Medium',
      criteria: [{ id: 'criterion-1', text: 'Projects link to work', satisfied: false, sortOrder: 0 }],
    }]) }));
    render(<MemoryRouter initialEntries={['/projects/project-1']}><App /></MemoryRouter>);
    expect(await screen.findByRole('link', { name: 'Navigate projects' })).toHaveAttribute('href', '/work-items/work-1');
    expect(screen.getByText('0 of 1 acceptance criteria complete')).toBeInTheDocument();
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
    fireEvent.click(await screen.findByRole('button', { name: 'Add project' }));
    expect(await screen.findByText('Enter a project key.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Project key/), { target: { value: 'RY' } });
    fireEvent.change(screen.getByLabelText(/Name/), { target: { value: 'Ryan Demo' } });
    fireEvent.change(screen.getByLabelText(/Business goal/), { target: { value: 'Show the workflow' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add project' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Project created.');
    expect(await screen.findByRole('link', { name: 'RY · Ryan Demo' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/projects', expect.objectContaining({ method: 'POST', body: JSON.stringify({ key: 'RY', name: 'Ryan Demo', description: '', businessGoal: 'Show the workflow' }) }));
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
    fireEvent.click(await screen.findByRole('button', { name: 'Add feature' }));
    expect(await screen.findByText('Enter a feature title.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Title/), { target: { value: 'Show Ryan the demo' } });
    fireEvent.change(screen.getByLabelText(/Acceptance criteria/), { target: { value: 'Project is visible\nFeature is visible' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add feature' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Feature created.');
    expect(await screen.findByRole('link', { name: 'Show Ryan the demo' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/projects/project-2/features', expect.objectContaining({ method: 'POST', body: JSON.stringify({ title: 'Show Ryan the demo', description: '', acceptanceCriteria: ['Project is visible', 'Feature is visible'] }) }));
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
        nodes: [{ id: 'node-1', name: 'Miriam', status: 'Online', maximumConcurrentJobs: 2, currentJobCount: 0 }],
        agents: [{ id: 'agent-1', name: 'Codex', version: '1.0', supportedModelProviders: ['OpenAI'] }],
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
});
