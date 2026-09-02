# Production deployment

Giga Desk uses five isolated Railway services:

1. `giga-desk-web` from `Dockerfile.web`, with a public domain.
2. `giga-desk-api` from `Dockerfile.api`, reachable from the web service over Railway private networking.
3. `giga-desk-postgres`, attached only to the API.
4. `giga-desk-keycloak` from `Dockerfile.keycloak`, with its own public domain.
5. `giga-desk-keycloak-postgres`, attached only to Keycloak.

The web service proxies `/api/*` to `API_UPSTREAM`, so browsers use one application origin. Set its build variables to the public Keycloak URL, realm `giga-desk`, and client `giga-desk-web`. Set the API issuer to the same public realm URL, audience to `giga-desk-api`, and JWKS URL to Keycloak's private-network realm certificate endpoint.

Keycloak must use PostgreSQL, HTTPS hostname metadata, forwarded proxy headers, and generated bootstrap-admin credentials. Create the production realm and public client only after both public domains exist so redirect URIs and web origins can be exact. Do not import `keycloak/realm-local.json`: it deliberately contains local credentials and loopback origins.

The API container runs `prisma migrate deploy` before startup. Recovery requires restoring the application database and Keycloak database independently; a successful application deployment is not backup verification.
