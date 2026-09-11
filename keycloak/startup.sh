#!/bin/sh

# Wait for Keycloak to be ready
for i in {1..60}; do
  if curl -s https://localhost:8080/realms/master > /dev/null 2>&1; then
    echo "Keycloak is ready"
    break
  fi
  echo "Waiting for Keycloak... $i"
  sleep 1
done

# Update the giga-desk realm to set sslRequired=none
curl -s -X PUT https://localhost:8080/admin/realms/giga-desk \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"sslRequired": "none"}'

echo "Updated giga-desk realm sslRequired to none"
