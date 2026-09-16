import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://127.0.0.1:4391' },
  webServer: {
    command: 'VITE_AUTH0_TEST_MODE=true npm run build && npm exec vite -- preview --host 127.0.0.1 --port 4391',
    port: 4391,
    reuseExistingServer: process.env['PLAYWRIGHT_REUSE_EXISTING'] === 'true',
  },
});
