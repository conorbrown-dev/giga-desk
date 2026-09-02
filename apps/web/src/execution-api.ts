export interface ExecutionHistory {
  id: string; status: string; requestedAt: string; startedAt: string | null; completedAt: string | null;
  failureReason: string | null; branchName: string | null; commitHash: string | null; pullRequestUrl: string | null;
  node: { id: string; name: string }; agent: { id: string; name: string; version: string };
  model: { id: string; displayName: string; provider: string };
  progress: readonly { phase: string; message: string; createdAt: string }[];
  tests: readonly { type: string; result: string; testCount: number | null; createdAt: string }[];
  deployments: readonly { environment: string; status: string; version: string | null; url: string | null; startedAt: string; completedAt: string | null }[];
}

export interface ExecutionTargets {
  nodes: readonly { id: string; name: string; status: string; maximumConcurrentJobs: number; currentJobCount: number }[];
  agents: readonly { id: string; name: string; version: string; supportedModelProviders: readonly string[] }[];
  models: readonly { id: string; displayName: string; provider: string; location: string }[];
}

export interface ExecutionSelection { executionNodeId: string; agentId: string; modelId: string }

export async function fetchExecutionHistory(workItemId: string, signal: AbortSignal): Promise<readonly ExecutionHistory[]> {
  const token = await getAuthToken();
  const response = await fetch(`/api/work-items/${workItemId}/executions`, { headers: { Authorization: `Bearer ${token}` }, signal });
  if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Sign in to view execution history.' : 'Execution history is unavailable.');
  return response.json() as Promise<readonly ExecutionHistory[]>;
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
import { getAuthToken } from './auth-token.js';
