import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { App } from './app.js';
import { auth0AuthorizationParameters, auth0Settings, isAuth0TestMode, setAccessTokenGetter } from './auth-token.js';

function Auth0Application() {
  const { error, getAccessTokenSilently, isAuthenticated, isLoading, loginWithRedirect, logout, user } = useAuth0();

  useEffect(() => setAccessTokenGetter(async () => (await getAccessTokenSilently()) ?? ''), [getAccessTokenSilently]);

  if (isLoading) return <main className="auth-page"><p>Checking your session…</p></main>;
  if (error) return <App authentication={{ configured: true, authenticated: false, username: null, error: 'Authentication is unavailable.', login: async () => {}, logout: async () => {} }} />;
  return <App authentication={{
    configured: true,
    authenticated: isAuthenticated,
    username: user?.nickname ?? user?.name ?? user?.email ?? null,
    error: null,
    login: async () => loginWithRedirect(),
    logout: async () => logout({ logoutParams: { returnTo: window.location.origin } }),
  }} />;
}

export function Auth0Root() {
  const settings = auth0Settings();
  if (isAuth0TestMode()) return <App authentication={{ configured: true, authenticated: true, username: 'test-user', error: null, login: async () => {}, logout: async () => {} }} />;
  if (!settings) return <App authentication={{ configured: false, authenticated: false, username: null, error: null, login: async () => {}, logout: async () => {} }} />;
  return <Auth0Provider
    domain={settings.domain}
    clientId={settings.clientId}
    authorizationParams={auth0AuthorizationParameters(settings, window.location.origin)}
  ><Auth0Application /></Auth0Provider>;
}
