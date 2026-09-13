import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const keycloakClient = vi.hoisted(() => ({
  init: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  updateToken: vi.fn(),
  authenticated: false,
  token: undefined as string | undefined,
  tokenParsed: undefined as Record<string, unknown> | undefined,
}));
const Keycloak = vi.hoisted(() => vi.fn(function KeycloakMock() { return keycloakClient; }));

vi.mock('keycloak-js', () => ({ default: Keycloak }));

import { initializeAuthentication } from './auth-token.js';

describe('initializeAuthentication', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_KEYCLOAK_URL', 'https://keycloak.example.com');
    vi.stubEnv('VITE_KEYCLOAK_REALM', 'giga-desk');
    vi.stubEnv('VITE_KEYCLOAK_CLIENT_ID', 'giga-desk-web');
    keycloakClient.init.mockResolvedValue(false);
    keycloakClient.login.mockResolvedValue(undefined);
    keycloakClient.logout.mockResolvedValue(undefined);
    keycloakClient.authenticated = false;
    keycloakClient.token = undefined;
    keycloakClient.tokenParsed = undefined;
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('initializes the Keycloak adapter before exposing sign in', async () => {
    const authentication = await initializeAuthentication();

    expect(keycloakClient.init).toHaveBeenCalledWith({
      pkceMethod: 'S256',
      checkLoginIframe: false,
    });

    await authentication.login();

    expect(keycloakClient.login).toHaveBeenCalledOnce();
  });

  it('returns the authenticated user parsed during initialization', async () => {
    keycloakClient.init.mockResolvedValue(true);
    keycloakClient.authenticated = true;
    keycloakClient.tokenParsed = { preferred_username: 'conor' };

    const authentication = await initializeAuthentication();

    expect(authentication.authenticated).toBe(true);
    expect(authentication.username).toBe('conor');
  });
});
