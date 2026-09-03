import { AgentApi } from '@giga-desk/agent-client/agent-api';
import { ClientCredentialsTokenProvider } from '@giga-desk/agent-client/machine-token';
import { setTimeout as delay } from 'node:timers/promises';
import { CodexExecutor } from './codex-executor.js';
import { OpenCodeExecutor } from './opencode-executor.js';
import { resolveOpenCodeRegistration } from './opencode-registration.js';
import { resolveCodexRegistration } from './codex-registration.js';
import { CodexWorker, type ApprovedRepositories } from './worker.js';

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const positiveInteger = (name: string, fallback: number): number => {
  const value = Number(process.env[name] ?? String(fallback));
  if (!Number.isSafeInteger(value) || value < 100) throw new Error(`${name} must be an integer of at least 100`);
  return value;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const approvedRepositories = (): ApprovedRepositories => {
  const raw = process.env['GIGA_DESK_WORKER_REPOSITORIES']?.trim() || '[]';
  let entries: unknown;
  try { entries = JSON.parse(raw); } catch { throw new Error('GIGA_DESK_WORKER_REPOSITORIES must be valid JSON'); }
  if (!Array.isArray(entries)) throw new Error('GIGA_DESK_WORKER_REPOSITORIES must be a JSON array');
  const repositories = new Map<string, string>();
  for (const entry of entries) {
    if (!isRecord(entry) || typeof entry['url'] !== 'string' || typeof entry['path'] !== 'string'
      || !entry['url'].trim() || !entry['path'].trim()) throw new Error('Each approved repository needs a URL and local path');
    repositories.set(entry['url'].trim(), entry['path'].trim());
  }
  return repositories;
};

const nodeId = required('GIGA_DESK_AGENT_NODE_ID');
const provider = new ClientCredentialsTokenProvider(
  required('GIGA_DESK_AGENT_OIDC_TOKEN_URL'), required('GIGA_DESK_AGENT_OIDC_CLIENT_ID'),
  required('GIGA_DESK_AGENT_OIDC_CLIENT_SECRET'),
);
const api = new AgentApi(required('GIGA_DESK_AGENT_API_URL'), provider.getToken.bind(provider));
const agentType = process.env['GIGA_DESK_WORKER_AGENT_TYPE']?.trim() ?? 'CodexCli';
if (agentType === 'OpenCode') await api.registerOpenCode(nodeId, resolveOpenCodeRegistration());
if (agentType === 'CodexCli') await api.registerCodex(nodeId, resolveCodexRegistration());
const executor = agentType === 'OpenCode'
  ? new OpenCodeExecutor() : new CodexExecutor();
const repositories = approvedRepositories();
const worker = new CodexWorker(api, executor, nodeId, repositories);
const pollInterval = positiveInteger('GIGA_DESK_AGENT_POLL_INTERVAL_MS', 5_000);
const heartbeatInterval = positiveInteger('GIGA_DESK_AGENT_HEARTBEAT_INTERVAL_MS', 30_000);
const stop = new AbortController();
process.once('SIGINT', () => { stop.abort(); });
process.once('SIGTERM', () => { stop.abort(); });

const heartbeat = setInterval(() => {
  void api.heartbeat(nodeId).catch((error: unknown) => {
    process.stderr.write(`Heartbeat failed: ${error instanceof Error ? error.message : 'unknown error'}\n`);
  });
}, heartbeatInterval);

try {
  while (!stop.signal.aborted) {
    try {
      const jobId = repositories.size === 0 ? null : await worker.runNext();
      process.stdout.write(jobId ? `Completed execution ${jobId}\n` : repositories.size === 0
        ? 'No approved repositories configured; waiting for configuration\n' : 'No queued jobs\n');
      if (jobId) continue;
    } catch (error) {
      process.stderr.write(`Worker cycle failed: ${error instanceof Error ? error.message : 'unknown error'}\n`);
    }
    try { await delay(pollInterval, undefined, { signal: stop.signal }); } catch (error) {
      if (!(error instanceof Error) || error.name !== 'AbortError') throw error;
    }
  }
} finally {
  clearInterval(heartbeat);
}
