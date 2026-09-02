import { AgentApi } from '@giga-desk/agent-client/agent-api';
import { poll } from './simulator.js';
import { ClientCredentialsTokenProvider, type AccessTokenProvider } from '@giga-desk/agent-client/machine-token';

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};
const interval = Number(process.env['GIGA_DESK_AGENT_POLL_INTERVAL_MS'] ?? '5000');
if (!Number.isSafeInteger(interval) || interval < 100) {
  throw new Error('GIGA_DESK_AGENT_POLL_INTERVAL_MS must be an integer of at least 100');
}
const apiUrl = process.env['GIGA_DESK_AGENT_API_URL']?.trim() || 'http://127.0.0.1:3000';
const nodeId = required('GIGA_DESK_AGENT_NODE_ID');
const staticToken = process.env['GIGA_DESK_AGENT_TOKEN']?.trim();
const token: string | AccessTokenProvider = staticToken || (() => {
  const provider = new ClientCredentialsTokenProvider(
    required('GIGA_DESK_AGENT_OIDC_TOKEN_URL'), required('GIGA_DESK_AGENT_OIDC_CLIENT_ID'),
    required('GIGA_DESK_AGENT_OIDC_CLIENT_SECRET'),
  );
  return provider.getToken.bind(provider);
})();
const stop = new AbortController();
process.once('SIGINT', () => { stop.abort(); });
process.once('SIGTERM', () => { stop.abort(); });

await poll(
  new AgentApi(apiUrl, token), nodeId, interval,
  process.env['GIGA_DESK_AGENT_ONCE'] === 'true', stop.signal,
  (message) => { process.stdout.write(`${message}\n`); },
);
