export interface ExecutionHistory {
  id: string; status: string; requestedAt: string; startedAt: string | null; completedAt: string | null;
  failureReason: string | null; branchName: string | null; commitHash: string | null; pullRequestUrl: string | null;
  node: { id: string; name: string }; agent: { id: string; name: string; version: string };
  model: { id: string; displayName: string; provider: string };
  process: { id: number; startedAt: string; terminationRequestedAt: string | null } | null;
  progress: readonly { phase: string; message: string; createdAt: string }[];
  tests: readonly { type: string; result: string; testCount: number | null; createdAt: string }[];
  deployments: readonly { environment: string; status: string; version: string | null; url: string | null; startedAt: string; completedAt: string | null }[];
}

export interface ExecutionTargets {
  nodes: readonly { id: string; name: string; status: string; maximumConcurrentJobs: number; currentJobCount: number; capabilities: { agentTypes?: readonly string[]; modelProviders?: readonly string[] } }[];
  agents: readonly { id: string; name: string; agentType: string; version: string; supportedModelProviders: readonly string[] }[];
  models: readonly { id: string; displayName: string; provider: string; location: string }[];
}
export interface RepositoryMapping { url: string; path: string }

export interface ExecutionSelection {
  executionNodeId: string; agentId: string; modelId: string; protectedActionsApproved: boolean;
}

export async function fetchExecutionHistory(workItemId: string, signal: AbortSignal): Promise<readonly ExecutionHistory[]> {
  const token = await getAuthToken();
  const response = await fetch(`/api/work-items/${workItemId}/executions`, { headers: { Authorization: `Bearer ${token}` }, signal });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Sign in to view execution history.' : 'Execution history is unavailable.');
  return response.json() as Promise<readonly ExecutionHistory[]>;
}

export async function streamExecutionHistory(
  workItemId: string, signal: AbortSignal, onHistory: (history: readonly ExecutionHistory[]) => void,
): Promise<void> {
  const token = await getAuthToken();
  const response = await fetch(`/api/work-items/${workItemId}/executions/stream`, {
    headers: { Accept: 'text/event-stream', Authorization: `Bearer ${token}` }, signal,
  });
  if (!response.ok || !response.body) throw new Error('Live execution updates are unavailable.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const event of events) {
      const data = event.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
      if (!data) continue;
      const history: unknown = JSON.parse(data);
      if (Array.isArray(history)) onHistory(history as readonly ExecutionHistory[]);
    }
  }
}

export async function fetchExecutionTargets(signal: AbortSignal): Promise<ExecutionTargets> {
  const token = await getAuthToken();
  const response = await fetch('/api/execution/targets', { headers: { Authorization: `Bearer ${token}` }, signal });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Sign in to start work.' : 'Execution targets are unavailable.');
  return response.json() as Promise<ExecutionTargets>;
}

export async function createExecution(workItemId: string, selection: ExecutionSelection): Promise<void> {
  const token = await getAuthToken();
  const response = await fetch(`/api/work-items/${workItemId}/executions`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(selection),
  });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Sign in to start work.' : response.status === 409 ? 'Work is already active or the selected targets are incompatible.' : 'Unable to start work.');
}

export async function clearExecution(workItemId: string, jobId: string): Promise<void> {
  const token = await getAuthToken();
  const response = await fetch(`/api/work-items/${workItemId}/executions/${jobId}/clear`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(response.status === 409 ? 'This execution is active or no longer available to clear.' : 'Unable to clear the execution.');
}

export async function retryExecution(workItemId: string, jobId: string): Promise<void> {
  const token = await getAuthToken();
  const response = await fetch(`/api/work-items/${workItemId}/executions/${jobId}/retry`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(response.status === 409 ? 'This execution cannot be retried on its previous target.' : 'Unable to retry the execution.');
}

export async function terminateExecution(workItemId: string, jobId: string): Promise<void> {
  const token = await getAuthToken();
  const response = await fetch(`/api/work-items/${workItemId}/executions/${jobId}/terminate`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(response.status === 409 ? 'This execution process is no longer running.' : 'Unable to terminate the execution process.');
}

export async function updateRepositoryMappings(nodeId: string, mappings: readonly RepositoryMapping[]): Promise<void> {
  const token = await getAuthToken();
  const response = await fetch(`/api/execution/targets/${nodeId}/repositories`, {
    method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mappings }),
  });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Sign in to configure the worker.' : 'Unable to save repository mapping.');
}
import { getAuthToken } from './auth-token.js';
