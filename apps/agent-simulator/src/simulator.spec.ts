import { describe, expect, it, vi } from 'vitest';
import { AgentApi } from '@giga-desk/agent-client/agent-api';
import { simulateNext } from './simulator.js';

const response = (body: unknown): Response => new Response(JSON.stringify(body), {
  status: 200, headers: { 'Content-Type': 'application/json' },
});

describe('polling agent simulator', () => {
  it('leaves the API unchanged when no work is queued', async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({ status: 'Online' }))
      .mockResolvedValueOnce(response([]));
    await expect(simulateNext(new AgentApi('http://api.test', 'token', request), 'node-1')).resolves.toBeNull();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('reports the complete successful lifecycle with stable evidence keys', async () => {
    const paths: string[] = [];
    const bodies: unknown[] = [];
    const request = vi.fn<typeof fetch>().mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const path = new URL(url).pathname;
      paths.push(path);
      if (typeof init?.body === 'string') bodies.push(JSON.parse(init.body) as unknown);
      if (path.endsWith('/jobs')) return Promise.resolve(response([{ id: 'job-1', status: 'Queued' }]));
      if (path.endsWith('/work-package')) return Promise.resolve(response({
        workItem: { title: 'Ship polling', acceptanceCriteria: [{ id: 'criterion-1', text: 'Done', satisfied: false }] },
      }));
      return Promise.resolve(response({}));
    });

    await expect(simulateNext(new AgentApi('http://api.test', 'machine-token', request), 'node-1'))
      .resolves.toBe('job-1');
    expect(paths).toEqual([
      '/api/agent/nodes/node-1/heartbeat', '/api/agent/nodes/node-1/jobs', '/api/agent/jobs/job-1/claim',
      '/api/agent/jobs/job-1/work-package', '/api/agent/jobs/job-1/start',
      '/api/agent/jobs/job-1/progress', '/api/agent/jobs/job-1/tests',
      '/api/agent/jobs/job-1/tests', '/api/agent/jobs/job-1/deployment',
      '/api/agent/jobs/job-1/tests', '/api/agent/jobs/job-1/complete',
    ]);
    expect(bodies.at(-1)).toMatchObject({
      satisfiedAcceptanceCriterionIds: ['criterion-1'],
      idempotencyKey: 'simulator:job-1:completion',
    });
    expect(request.mock.calls.every(([, init]) =>
      new Headers(init?.headers).get('Authorization') === 'Bearer machine-token')).toBe(true);
  });
});
