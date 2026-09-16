# Auth0 setup

Giga Desk uses Auth0 exclusively for browser authentication and API bearer tokens.

## Auth0 tenant

Create a **Single Page Application** named `Giga Desk Web` and an **API** for Giga Desk. Enable RBAC for the API and enable **Add Permissions in the Access Token**. Create these API permissions:

- `projects:read`, `projects:create`
- `work-items:read`, `work-items:create`, `work-items:update`
- `executions:read`, `executions:create`
- `agent:jobs`

Assign the appropriate permissions through Auth0 roles. Configure MFA in Auth0 for this application’s users.

For the SPA, add the production origin to **Allowed Callback URLs**, **Allowed Logout URLs**, and **Allowed Web Origins**. Add each local development origin used by the Vite app separately. Do not use wildcard origins.

## Railway variables

Set these build-time variables on the Giga Desk service:

- `VITE_AUTH0_DOMAIN`: Auth0 tenant domain, without a path
- `VITE_AUTH0_CLIENT_ID`: SPA client ID
- `VITE_AUTH0_AUDIENCE`: Giga Desk API identifier

Set these API variables to the same Auth0 tenant and API:

- `AUTH_ISSUER`: `https://<tenant-domain>/`
- `AUTH_JWKS_URL`: `https://<tenant-domain>/.well-known/jwks.json`
- `AUTH_AUDIENCE`: the same API identifier as `VITE_AUTH0_AUDIENCE`

Vite embeds `VITE_*` values at build time, so redeploy after changing them. The API must reject tokens whose issuer, audience, signature, or permissions do not match these settings.
