import { spawn } from 'node:child_process';

const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://giga_desk:giga_desk@127.0.0.1:5442/giga_desk?schema=public';
const issuer = 'http://127.0.0.1:8080/realms/giga-desk';
for (let attempt = 0; attempt < 60; attempt += 1) {
  try {
    const response = await fetch(`${issuer}/.well-known/openid-configuration`);
    if (response.ok) break;
  } catch { /* Keycloak is still starting. */ }
  if (attempt === 59) throw new Error('Keycloak did not become ready within 60 seconds');
  await new Promise((resolve) => { setTimeout(resolve, 1_000); });
}
const api = spawn(process.execPath, ['apps/api/dist/main.js'], {
  stdio: 'inherit', env: {
    ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: 'development', PORT: '3000',
    AUTH_ISSUER: issuer, AUTH_AUDIENCE: 'giga-desk-api', AUTH_JWKS_URL: `${issuer}/protocol/openid-connect/certs`,
  },
});
const web = spawn('npm', ['exec', 'vite', '--', '--host', '127.0.0.1', '--port', '5173'], {
  cwd: 'apps/web', stdio: 'inherit', env: {
    ...process.env, VITE_KEYCLOAK_URL: 'http://127.0.0.1:8080',
    VITE_KEYCLOAK_REALM: 'giga-desk', VITE_KEYCLOAK_CLIENT_ID: 'giga-desk-web',
  },
});

process.stdout.write('\nGiga Desk demo: http://127.0.0.1:5173\nSign in with demo / giga-desk-demo\nPress Ctrl+C to stop the app.\n\n');
const stop = () => { api.kill('SIGTERM'); web.kill('SIGTERM'); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
await Promise.race([
  new Promise((resolve) => { api.once('exit', resolve); }),
  new Promise((resolve) => { web.once('exit', resolve); }),
]);
stop();
