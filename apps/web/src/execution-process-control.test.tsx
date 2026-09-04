import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExecutionHistory } from './execution-api.js';
import { ExecutionProcessControl } from './execution-process-control.js';

const execution: ExecutionHistory = {
  id: 'job-1', status: 'Running', requestedAt: '2026-09-04T14:00:00.000Z', startedAt: '2026-09-04T14:00:01.000Z',
  completedAt: null, failureReason: null, branchName: null, commitHash: null, pullRequestUrl: null,
  node: { id: 'node-1', name: 'Miriam' }, agent: { id: 'agent-1', name: 'Codex CLI', version: '0.153.2' },
  model: { id: 'model-1', displayName: 'GPT-5', provider: 'OpenAI' },
  process: { id: 4_321, startedAt: '2026-09-04T14:00:02.000Z', terminationRequestedAt: null },
  progress: [], tests: [], deployments: [],
};

describe('ExecutionProcessControl', () => {
  afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

  it('shows the owned PID and requires confirmation before requesting termination', async () => {
    localStorage.setItem('giga-desk-token', 'test-token');
    const request = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    vi.stubGlobal('fetch', request);
    const onChanged = vi.fn();
    render(<ExecutionProcessControl execution={execution} workItemId="work-1" onChanged={onChanged} />);
    expect(screen.getByText('PID 4321')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stop process' }));
    expect(request).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    await waitFor(() => { expect(onChanged).toHaveBeenCalledOnce(); });
    expect(request).toHaveBeenCalledWith('/api/work-items/work-1/executions/job-1/terminate', expect.objectContaining({ method: 'POST' }));
  });

  it('keeps the process visible when termination is rejected', async () => {
    localStorage.setItem('giga-desk-token', 'test-token');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 409 }));
    render(<ExecutionProcessControl execution={execution} workItemId="work-1" onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Stop process' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('no longer running');
    expect(screen.getByText('PID 4321')).toBeInTheDocument();
  });
});
