export interface DiscoverableJob { id: string; status: 'Queued' }

export interface WorkPackage {
  workItem: {
    title: string;
    acceptanceCriteria: readonly { id: string; text: string; satisfied: boolean }[];
  };
}

export class AgentApiError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export class AgentApi {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly request: typeof fetch = fetch,
  ) {}

  private async send<T>(path: string, method: 'GET' | 'POST', body?: object): Promise<T> {
    const response = await this.request(new URL(path, this.baseUrl), {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
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

  workPackage(jobId: string): Promise<WorkPackage> {
    return this.send(`/api/agent/jobs/${jobId}/work-package`, 'GET');
  }

  post(jobId: string, action: string, body?: object): Promise<unknown> {
    return this.send(`/api/agent/jobs/${jobId}/${action}`, 'POST', body);
  }
}
