import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://127.0.0.1:4391' },
  webServer: {
    command: 'VITE_KEYCLOAK_URL=http://127.0.0.1:8080 VITE_KEYCLOAK_REALM=giga-desk VITE_KEYCLOAK_CLIENT_ID=giga-desk-web npm run build && npm exec vite -- preview --host 127.0.0.1 --port 4391',
    port: 4391,
  },
});
