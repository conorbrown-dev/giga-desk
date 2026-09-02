import type { AccessTokenProvider } from './machine-token.js';

export interface DiscoverableJob { id: string; status: 'Queued' }

export interface WorkPackage {
  executionJobId: string;
  authorization: { protectedActionsApproved: boolean };
  project: { id: string; key: string; name: string; description: string; businessGoal: string;
    repositoryUrl: string | null; defaultBranch: string | null };
  workItem: { id: string; type: string; title: string; description: string; technicalNotes: string | null;
    implementationInstructions: string | null; parent: { id: string; title: string } | null;
    visualReferences: readonly { name: string; mediaType: string; dataBase64: string }[];
    acceptanceCriteria: readonly { id: string; text: string; satisfied: boolean }[];
    dependencies: readonly { id: string; title: string; status: string }[] };
  execution: { node: { id: string; name: string }; agent: { id: string; name: string; type: string; version: string };
    model: { id: string; displayName: string; provider: string; identifier: string } };
  expectations: { tests: readonly ('Unit' | 'Integration' | 'EndToEnd')[]; deploymentRequired: boolean;
    visualReviewRequired: boolean };
}

export class AgentApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export class AgentApi {
  constructor(
    private readonly baseUrl: string,
    token: string | AccessTokenProvider,
    private readonly request: typeof fetch = fetch,
  ) {
    this.token = typeof token === 'string' ? () => Promise.resolve(token) : token;
  }

  private readonly token: AccessTokenProvider;

  private async send<T>(path: string, method: 'GET' | 'POST', body?: object): Promise<T> {
    const response = await this.request(new URL(path, this.baseUrl), {
      method,
      headers: {
        Authorization: `Bearer ${await this.token()}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new AgentApiError(response.status, detail || `Agent API returned ${String(response.status)}`);
    }
    return response.json() as Promise<T>;
  }

  discover(nodeId: string): Promise<readonly DiscoverableJob[]> {
    return this.send(`/api/agent/nodes/${nodeId}/jobs`, 'GET');
  }

  heartbeat(nodeId: string): Promise<unknown> {
    return this.send(`/api/agent/nodes/${nodeId}/heartbeat`, 'POST');
  }

  workPackage(jobId: string): Promise<WorkPackage> {
    return this.send(`/api/agent/jobs/${jobId}/work-package`, 'GET');
  }

  post(jobId: string, action: string, body?: object): Promise<unknown> {
    return this.send(`/api/agent/jobs/${jobId}/${action}`, 'POST', body);
  }
}
