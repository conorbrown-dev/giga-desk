import { AgentApi } from '@giga-desk/agent-client/agent-api';
import { ClientCredentialsTokenProvider } from '@giga-desk/agent-client/machine-token';
import { setTimeout as delay } from 'node:timers/promises';
import { CodexExecutor } from './codex-executor.js';
import { CodexWorker } from './worker.js';

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

const nodeId = required('GIGA_DESK_AGENT_NODE_ID');
const provider = new ClientCredentialsTokenProvider(
  required('GIGA_DESK_AGENT_OIDC_TOKEN_URL'), required('GIGA_DESK_AGENT_OIDC_CLIENT_ID'),
  required('GIGA_DESK_AGENT_OIDC_CLIENT_SECRET'),
);
const api = new AgentApi(required('GIGA_DESK_AGENT_API_URL'), provider.getToken.bind(provider));
const worker = new CodexWorker(api, new CodexExecutor(), nodeId,
  required('GIGA_DESK_WORKER_REPOSITORY_URL'), required('GIGA_DESK_WORKER_REPOSITORY_PATH'));
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
      const jobId = await worker.runNext();
      process.stdout.write(jobId ? `Completed execution ${jobId}\n` : 'No queued jobs\n');
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
