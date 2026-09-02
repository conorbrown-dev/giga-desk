import { describe, expect, it, vi } from 'vitest';
import { ClientCredentialsTokenProvider } from './machine-token.js';

describe('ClientCredentialsTokenProvider', () => {
  it('requests and caches a short-lived client-credentials token', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      access_token: 'machine-token', expires_in: 300,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const provider = new ClientCredentialsTokenProvider(
      'https://identity.test/token', 'worker-client', 'secret', request, () => 1_000,
    );

    await expect(provider.getToken()).resolves.toBe('machine-token');
    await expect(provider.getToken()).resolves.toBe('machine-token');
    expect(request).toHaveBeenCalledOnce();
    const body = request.mock.calls[0]?.[1]?.body;
    if (!(body instanceof URLSearchParams)) throw new Error('Expected form-encoded token request');
    expect(body.get('grant_type')).toBe('client_credentials');
    expect(body.get('client_id')).toBe('worker-client');
    expect(body.get('client_secret')).toBe('secret');
  });

  it('rejects an invalid token response', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      access_token: '', expires_in: 300,
    }), { status: 200 }));
    const provider = new ClientCredentialsTokenProvider('https://identity.test/token', 'client', 'secret', request);
    await expect(provider.getToken()).rejects.toThrow('invalid');
  });
});
