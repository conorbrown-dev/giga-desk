#!/bin/bash

# Script to recreate the giga-desk realm with correct SSL settings
# Run this after deploying Keycloak with the updated realm configuration

# First, we need to get the admin token
# This requires the admin-cli client to have a secret, which we don't have in the current setup
# So we need to either:
# 1. Add a client secret to admin-cli (not recommended for production)
# 2. Use a different authentication method
# 3. Manually import the realm via the admin console

# For now, we'll document the manual steps:

echo "To fix the giga-desk realm, follow these steps:"
echo "1. Access the Keycloak admin console: https://giga-desk-keycloak-production.up.railway.app/admin"
echo "2. Log in with the admin credentials (you need to set these up)"
echo "3. Go to Realm Settings > Locale and ensure sslRequired is set to 'none'"
echo "4. Or, re-import the realm using the 'Import' feature with realm-local.json"

# Alternative: Use the Keycloak CLI to import the realm
# docker run --rm -v $(pwd)/keycloak:/tmp/keycloak quay.io/keycloak/keycloak:26.3 import \
#   -r /tmp/keycloak/realm-local.json \
#   -s https://giga-desk-keycloak-production.up.railway.app \
#   -u admin -p admin
