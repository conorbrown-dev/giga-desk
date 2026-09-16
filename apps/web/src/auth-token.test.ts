import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { auth0AuthorizationParameters, auth0Settings, getAuthToken, setAccessTokenGetter } from './auth-token.js';

describe('Auth0 settings', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AUTH0_DOMAIN', 'https://auth0.example.com');
    vi.stubEnv('VITE_AUTH0_CLIENT_ID', 'giga-desk-web');
    vi.stubEnv('VITE_AUTH0_AUDIENCE', 'https://api.example.com');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('requires and normalizes the Auth0 SPA settings', () => {
    const settings = auth0Settings();
    expect(settings).toEqual({ domain: 'auth0.example.com', clientId: 'giga-desk-web', audience: 'https://api.example.com' });
    if (!settings) throw new Error('Expected Auth0 settings');
    expect(auth0AuthorizationParameters(settings, 'https://giga.example.com')).toEqual({
      audience: 'https://api.example.com', redirect_uri: 'https://giga.example.com',
    });
    vi.stubEnv('VITE_AUTH0_AUDIENCE', '');
    expect(auth0Settings()).toBeNull();
  });

  it('uses the Auth0 provider access token outside React components', async () => {
    const reset = setAccessTokenGetter(() => Promise.resolve('auth0-access-token'));
    await expect(getAuthToken()).resolves.toBe('auth0-access-token');
    reset();
    await expect(getAuthToken()).resolves.toBe('');
  });
});
