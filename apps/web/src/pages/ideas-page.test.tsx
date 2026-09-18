import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app.js';

const organizations = [
  { id: 'org-1', name: 'Praxis Labs', members: [{ role: 'Owner' }] },
  { id: 'org-2', name: 'Customer Council', members: [{ role: 'Coworker' }] },
];

const idea = (id: string, organizationId: string, title: string, status: 'Open' | 'Archived', comments: number) => ({
  id, organizationId, title, status, description: `${title} description`, createdBy: 'auth0|user',
  createdAt: '2026-09-17T12:00:00.000Z', updatedAt: '2026-09-18T12:00:00.000Z',
  comments: Array.from({ length: comments }, (_, index) => ({
    id: `comment-${String(index)}`, body: 'Useful feedback', authorId: 'auth0|member', createdAt: '2026-09-18T12:00:00.000Z',
  })),
});

describe('IdeasPage', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

  it('lists ideas for the selected member organization', async () => {
    localStorage.setItem('giga-desk-token', 'test-token');
    const fetchMock = vi.fn().mockImplementation((path: string) => {
      if (path === '/api/organizations') return Promise.resolve({ ok: true, json: () => Promise.resolve(organizations) });
      const ideas = path.includes('org-1')
        ? [idea('idea-1', 'org-1', 'Customer research board', 'Open', 2), idea('idea-2', 'org-1', 'Retired proposal', 'Archived', 0)]
        : [idea('idea-3', 'org-2', 'Shared discovery calls', 'Open', 1)];
      return Promise.resolve({ ok: true, json: () => Promise.resolve(ideas) });
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<MemoryRouter initialEntries={['/ideas']}><App /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Customer research board' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ideas' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByLabelText('Idea summary')).toHaveTextContent('Open ideas1Archived1Discussion posts2');
    expect(screen.getByText('Open', { selector: '.status-chip' })).toHaveClass('status-positive');
    expect(screen.getByText('Retired proposal').closest('[data-slot="card"]')).toHaveTextContent('Archived');
    expect(fetchMock).toHaveBeenCalledWith('/api/organizations', expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }));

    fireEvent.change(screen.getByLabelText('Organization'), { target: { value: 'org-2' } });
    expect(await screen.findByRole('heading', { name: 'Shared discovery calls' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Customer research board')).not.toBeInTheDocument());
    expect(screen.getByText('Coworker')).toBeInTheDocument();
  });

  it('explains how to gain access when the user has no organization', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) }));
    render(<MemoryRouter initialEntries={['/ideas']}><App /></MemoryRouter>);
    expect(await screen.findByText(/administrator with organizations:manage can create one/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Organization')).not.toBeInTheDocument();
  });

  it('validates and creates an idea as an authenticated organization member', async () => {
    localStorage.setItem('giga-desk-token', 'test-token');
    const ideas = [idea('idea-1', 'org-1', 'Existing proposal', 'Open', 0)];
    const fetchMock = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
      if (path === '/api/organizations') return Promise.resolve({ ok: true, json: () => Promise.resolve([organizations[0]]) });
      if (init?.method === 'POST') {
        expect(init.headers).toEqual({ Authorization: 'Bearer test-token', 'Content-Type': 'application/json' });
        expect(JSON.parse(String(init.body))).toEqual({ title: 'Customer advisory group', description: 'Validate demand with customers before delivery.' });
        ideas.unshift(idea('idea-2', 'org-1', 'Customer advisory group', 'Open', 0));
        return Promise.resolve({ ok: true, json: () => Promise.resolve(ideas[0]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(ideas) });
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<MemoryRouter initialEntries={['/ideas']}><App /></MemoryRouter>);

    await screen.findByRole('heading', { name: 'Existing proposal' });
    fireEvent.click(screen.getByRole('button', { name: 'Add idea' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create idea' }));
    expect(await screen.findByText('Enter an idea title.')).toBeInTheDocument();
    expect(screen.getByText('Describe the idea.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: ' Customer advisory group ' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Validate demand with customers before delivery.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create idea' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Idea “Customer advisory group” created.');
    expect(await screen.findByRole('heading', { name: 'Customer advisory group' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/organizations/org-1/ideas', expect.objectContaining({ method: 'POST' }));
  });
});
