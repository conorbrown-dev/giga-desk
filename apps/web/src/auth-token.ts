import { createAuth0Client, Auth0Client } from '@auth0/auth0-spa-js';

export interface AuthenticationState {
  configured: boolean;
  authenticated: boolean;
  username: string | null;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

let client: Auth0Client | null = null;

const setting = (name: string): string => {
  const value: unknown = (import.meta.env as Record<string, unknown>)[name];
  return typeof value === 'string' ? value.trim() : '';
};
const noAction = async (): Promise<void> => { };

export async function initializeAuthentication(): Promise<AuthenticationState> {
  const domain = setting('VITE_AUTH0_DOMAIN');
  const clientId = setting('VITE_AUTH0_CLIENT_ID');
  if (!domain || !clientId) {
    console.warn('Authentication not configured (missing:', { domain: !!domain, clientId: !!clientId });
    return { configured: false, authenticated: false, username: null, error: null, login: noAction, logout: noAction };
  }
  try {
    client = await createAuth0Client({
      domain,
      clientId,
    });
    const authenticated = await client.isAuthenticated();
    const user = await client.getUser();
    return {
      configured: true,
      authenticated,
      username: user?.preferred_username ?? null,
      error: null,
      login: async () => { if (client) await client.loginWithPopup(); },
      logout: async () => { if (client) await client.logout({ logoutParams: { returnTo: window.location.origin } }); },
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
  if (!client) return '';
  try {
    return await client.getTokenSilently() ?? '';
  } catch {
    return '';
  }
}

