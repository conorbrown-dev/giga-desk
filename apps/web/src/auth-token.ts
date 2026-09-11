import Keycloak from 'keycloak-js';

export interface AuthenticationState {
  configured: boolean;
  authenticated: boolean;
  username: string | null;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

let client: Keycloak | null = null;

const setting = (name: string): string => {
  const value: unknown = (import.meta.env as Record<string, unknown>)[name];
  return typeof value === 'string' ? value.trim() : '';
};
const noAction = async (): Promise<void> => {};

export async function initializeAuthentication(): Promise<AuthenticationState> {
  const url = setting('VITE_KEYCLOAK_URL');
  const realm = setting('VITE_KEYCLOAK_REALM');
  const clientId = setting('VITE_KEYCLOAK_CLIENT_ID');
  if (!url || !realm || !clientId) {
    console.warn('Authentication not configured (missing:', { url: !!url, realm: !!realm, clientId: !!clientId });
    return { configured: false, authenticated: false, username: null, error: null, login: noAction, logout: noAction };
  }
  try {
    client = new Keycloak({ url, realm, clientId });
    console.log('Auth: Initializing with', { url, realm, clientId });
    await client.init({
      onLoad: 'check-sso',
      pkceMethod: 'S256',
      checkLoginIframe: true,
      checkLoginIframeInterval: 300,
    });
    console.log('Auth: Init completed, token=', !!client?.token, 'authenticated=', client?.authenticated);
    return {
      configured: true,
      authenticated: client?.authenticated ?? false,
      username: client?.tokenParsed ? (client.tokenParsed['preferred_username'] as string) : null,
      error: null,
      login: async () => { await client?.login(); },
      logout: async () => { await client?.logout({ redirectUri: window.location.origin }); },
    };
  } catch (error: unknown) {
    client = null;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Authentication initialization error:', { message: errorMessage, stack: errorStack });
    return { configured: true, authenticated: false, username: null, error: 'Authentication is unavailable.', login: noAction, logout: noAction };
  }
}

export async function getAuthToken(): Promise<string> {
  if (import.meta.env.MODE === 'test') return localStorage.getItem('giga-desk-token') ?? '';
  if (!client?.authenticated) return '';
  await client.updateToken(30);
  return client.token ?? '';
}
