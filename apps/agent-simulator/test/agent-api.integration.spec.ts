import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { AgentApi, AgentApiError } from '../src/agent-api.js';

describe('agent API HTTP boundary', () => {
  let server: Server | undefined;
  afterEach(() => { server?.close(); server = undefined; });

  it('sends machine authorization and maps non-success responses', async () => {
    const received: string[] = [];
    server = createServer((request, response) => {
      received.push(request.headers.authorization ?? '');
      if (request.url?.endsWith('/jobs')) {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end('[]');
      } else {
        response.writeHead(409); response.end('already claimed');
      }
    });
    await new Promise<void>((resolve) => { server?.listen(0, '127.0.0.1', resolve); });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected a TCP test server');
    const api = new AgentApi(`http://127.0.0.1:${String(address.port)}`, 'worker-token');

    await expect(api.discover('node-1')).resolves.toEqual([]);
    await expect(api.post('job-1', 'claim')).rejects.toEqual(
      expect.objectContaining<Partial<AgentApiError>>({ status: 409, message: 'already claimed' }),
    );
    expect(received).toEqual(['Bearer worker-token', 'Bearer worker-token']);
  });
});
