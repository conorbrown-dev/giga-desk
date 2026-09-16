import { describe, expect, it } from 'vitest';
import { auth0ProviderOptions } from './auth0-application.js';

describe('Auth0 application', () => {
  it('persists the authenticated session cache across a page reload', () => {
    expect(auth0ProviderOptions({ domain: 'auth0.example.com', clientId: 'giga-desk-web', audience: 'https://api.example.com' }, 'https://giga.example.com'))
      .toMatchObject({ cacheLocation: 'localstorage', authorizationParams: { audience: 'https://api.example.com', redirect_uri: 'https://giga.example.com' } });
  });
});
