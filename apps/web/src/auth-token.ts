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
    const initializedClient = new Keycloak({ url, realm, clientId });
    const authenticated = await initializedClient.init({
      pkceMethod: 'S256',
      checkLoginIframe: false,
    });
    client = initializedClient;
    return {
      configured: true,
      authenticated,
      username: typeof initializedClient.tokenParsed?.['preferred_username'] === 'string'
        ? initializedClient.tokenParsed['preferred_username']
        : null,
      error: null,
      login: async () => { await initializedClient.login(); },
      logout: async () => { await initializedClient.logout({ redirectUri: window.location.origin }); },
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
