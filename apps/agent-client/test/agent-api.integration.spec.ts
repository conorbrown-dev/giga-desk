import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, it } from 'vitest';
import { AgentApi, AgentApiError } from '../src/agent-api.js';
import { ClientCredentialsTokenProvider } from '../src/machine-token.js';

describe('agent API HTTP boundary', () => {
  let server: Server | undefined;
  afterEach(() => { server?.close(); server = undefined; });

  it('sends machine authorization and maps non-success responses', async () => {
    const received: string[] = [];
    let tokenRequests = 0;
    server = createServer((request, response) => {
      if (request.url === '/token') {
        tokenRequests += 1;
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ access_token: 'worker-token', expires_in: 300 }));
        return;
      }
      received.push(request.headers.authorization ?? '');
      if (request.url?.endsWith('/opencode-registration')) {
        response.writeHead(201, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ agentId: 'agent-1' }));
      } else if (request.url?.endsWith('/heartbeat')) {
        response.writeHead(201, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ status: 'Online' }));
      } else if (request.url?.endsWith('/jobs')) {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end('[]');
      } else if (request.url?.endsWith('/control')) {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end('{"terminationRequested":true}');
      } else {
        response.writeHead(409); response.end('already claimed');
      }
    });
    await new Promise<void>((resolve) => { server?.listen(0, '127.0.0.1', resolve); });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected a TCP test server');
    const baseUrl = `http://127.0.0.1:${String(address.port)}`;
    const provider = new ClientCredentialsTokenProvider(`${baseUrl}/token`, 'worker', 'secret');
    const api = new AgentApi(baseUrl, provider.getToken.bind(provider));

    await expect(api.registerOpenCode('node-1', { agentName: 'MIRIAM', hostname: 'miriam.local',
      operatingSystem: 'linux', architecture: 'x64', agentVersion: '1.18.26', modelIdentifier: 'ollama/qwen' }))
      .resolves.toEqual({ agentId: 'agent-1' });
    await expect(api.heartbeat('node-1')).resolves.toEqual({ status: 'Online' });
    await expect(api.discover('node-1')).resolves.toEqual([]);
    await expect(api.control('job-1')).resolves.toEqual({ terminationRequested: true });
    await expect(api.post('job-1', 'claim')).rejects.toEqual(
      expect.objectContaining<Partial<AgentApiError>>({ status: 409, message: 'already claimed' }),
    );
    expect(tokenRequests).toBe(1);
    expect(received).toEqual(['Bearer worker-token', 'Bearer worker-token', 'Bearer worker-token', 'Bearer worker-token', 'Bearer worker-token']);
  });
});
