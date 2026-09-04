import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExecutionActions } from './execution-actions.js';

describe('ExecutionActions', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

  it('groups clear and retry actions for a failed execution', async () => {
    localStorage.setItem('giga-desk-token', 'test-token');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    vi.stubGlobal('fetch', fetchMock);
    const onChanged = vi.fn();
    render(<ExecutionActions executionId="job-1" status="Failed" workItemId="work-1" onChanged={onChanged} />);

    const actions = screen.getByRole('group', { name: 'Execution actions' });
    expect(actions).toContainElement(screen.getByRole('button', { name: 'Clear execution' }));
    expect(actions).toContainElement(screen.getByRole('button', { name: 'Retry execution' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear execution' }));

    await waitFor(() => { expect(onChanged).toHaveBeenCalledOnce(); });
    expect(fetchMock).toHaveBeenCalledWith('/api/work-items/work-1/executions/job-1/clear', expect.objectContaining({ method: 'POST' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry execution' }));
    await waitFor(() => { expect(onChanged).toHaveBeenCalledTimes(2); });
    expect(fetchMock).toHaveBeenCalledWith('/api/work-items/work-1/executions/job-1/retry', expect.objectContaining({ method: 'POST' }));
  });

  it('offers only clear for a queued execution and reports conflicts', async () => {
    localStorage.setItem('giga-desk-token', 'test-token');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 409 }));
    render(<ExecutionActions executionId="job-2" status="Queued" workItemId="work-1" onChanged={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Retry execution' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear execution' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This execution is active or no longer available to clear.');
  });
});
