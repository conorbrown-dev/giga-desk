import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth0Client = vi.hoisted(() => ({
  isAuthenticated: vi.fn(),
  loginWithPopup: vi.fn(),
  logout: vi.fn(),
  getTokenSilently: vi.fn(),
  getUser: vi.fn(),
}));
const auth0Create = vi.hoisted(() => vi.fn(() => Promise.resolve(auth0Client)));

vi.mock('@auth0/auth0-spa-js', () => ({ createAuth0Client: auth0Create }));

import { initializeAuthentication } from './auth-token.js';

describe('initializeAuthentication', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_AUTH0_DOMAIN', 'https://auth0.example.com');
    vi.stubEnv('VITE_AUTH0_CLIENT_ID', 'giga-desk-web');
    auth0Client.isAuthenticated.mockResolvedValue(false);
    auth0Client.loginWithPopup.mockResolvedValue(undefined);
    auth0Client.logout.mockResolvedValue(undefined);
    auth0Client.getTokenSilently.mockResolvedValue('');
    auth0Client.getUser.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('initializes the Auth0 adapter before exposing sign in', async () => {
    const authentication = await initializeAuthentication();

    expect(auth0Create).toHaveBeenCalled();

    await authentication.login();

    expect(auth0Client.loginWithPopup).toHaveBeenCalledOnce();
  });

  it('returns the authenticated user parsed during initialization', async () => {
    auth0Client.isAuthenticated.mockResolvedValue(true);
    auth0Client.getUser.mockResolvedValue({ preferred_username: 'conor' });

    const authentication = await initializeAuthentication();

    expect(authentication.authenticated).toBe(true);
    expect(authentication.username).toBe('conor');
  });
});
