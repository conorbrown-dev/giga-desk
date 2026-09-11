# Fix for the giga-desk realm "HTTPS required" error

## Root Cause
The `giga-desk` realm was created with HTTP URLs and `sslRequired=EXTERNAL` (default).
Keycloak's `KC_HTTP_RELAXED_AUTH` setting isn't disabling the TLS check as expected,
so the `/.well-known/openid-configuration` endpoint returns "HTTPS required".

## Solution
Re-import the giga-desk realm with `sslRequired=none` in the realm configuration.

### Step 1: Update realm-local.json (already done)
The `realm-local.json` file has been updated with `"sslRequired": "none"`.

### Step 2: Import the realm
Since we don't have admin credentials, we need to either:

A. Use Keycloak's admin console to import the realm
B. Set up admin credentials and use the REST API
C. Use a startup script to import the realm on first run

### Option C: Startup script (recommended for Docker)
Keycloak supports importing realms on startup using a script.

Add this to the Dockerfile:

```dockerfile
COPY keycloak/import-realms.sh /opt/keycloak/bin/import-realms.sh
RUN chmod +x /opt/keycloak/bin/import-realms.sh
```

The script would:
1. Start Keycloak in the background
2. Wait for it to be ready
3. Import the realm using the REST API
4. Stop Keycloak
5. Restart Keycloak normally

### Option B: Manual import via Admin Console
1. Access https://giga-desk-keycloak-production.up.railway.app/admin
2. Set up admin credentials (KC_ADMIN_USER and KC_ADMIN_PASSWORD)
3. Go to Realm Settings > Import
4. Upload the updated realm-local.json

## Updated Dockerfile Environment Variables
The following environment variables should be set:

```
KC_HTTP_RELAXED_AUTH=always
KC_HTTP_PROXY_HEADERS=xforwarded
KC_HOSTNAME=giga-desk-keycloak-production.up.railway.app
KC_SPI_CLUSTER_LOADBALANCING_STRATEGY=NONE
KC_CACHE=local
```

## Next Steps
1. Import the realm with `sslRequired=none` using one of the methods above
2. Verify the fix by visiting https://giga-desk-keycloak-production.up.railway.app/realms/giga-desk/.well-known/openid-configuration
3. The response should have `issuer` with HTTPS URLs
