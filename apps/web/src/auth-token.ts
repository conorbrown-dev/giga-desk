export interface AuthenticationState {
  configured: boolean;
  authenticated: boolean;
  username: string | null;
  error: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export interface Auth0Settings { domain: string; clientId: string; audience: string }

type AccessTokenGetter = () => Promise<string>;

let getAccessToken: AccessTokenGetter = () => Promise.resolve('');

const setting = (name: string): string => {
  const value: unknown = (import.meta.env as Record<string, unknown>)[name];
  return typeof value === 'string' ? value.trim() : '';
};

export const isAuth0TestMode = (): boolean => setting('VITE_AUTH0_TEST_MODE') === 'true';
export const auth0Settings = (): Auth0Settings | null => {
  const domain = setting('VITE_AUTH0_DOMAIN');
  const clientId = setting('VITE_AUTH0_CLIENT_ID');
  const audience = setting('VITE_AUTH0_AUDIENCE');
  if (!domain || !clientId || !audience) return null;
  return { domain: domain.replace(/^https?:\/\//, '').replace(/\/$/, ''), clientId, audience };
};

export const auth0AuthorizationParameters = (settings: Auth0Settings, redirectUri: string): { audience: string; redirect_uri: string } =>
  ({ audience: settings.audience, redirect_uri: redirectUri });

export const setAccessTokenGetter = (getter: AccessTokenGetter): (() => void) => {
  getAccessToken = getter;
  return () => { getAccessToken = () => Promise.resolve(''); };
};

export async function getAuthToken(): Promise<string> {
  if (isAuth0TestMode()) return 'test-token';
  if (import.meta.env.MODE === 'test') {
    const testToken = localStorage.getItem('giga-desk-token');
    if (testToken) return testToken;
  }
  try {
    return await getAccessToken();
  } catch {
    return '';
  }
}
