import { AgentApi, type WorkPackage } from '@giga-desk/agent-client/agent-api';
import { createServer, type Server } from 'node:http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CodexExecutionResult } from '../src/codex-executor.js';
import { CodexWorker, type WorkExecutor } from '../src/worker.js';

const work: WorkPackage = {
  executionJobId: 'job-1',
  authorization: { protectedActionsApproved: false },
  project: { id: 'project-1', key: 'GD', name: 'Giga Desk', description: 'Plan', businessGoal: 'Ship',
    repositoryUrl: 'https://github.com/conorbrown-dev/giga-desk.git', defaultBranch: 'main' },
  workItem: { id: 'work-1', type: 'Feature', title: 'Execute', description: 'Do it', technicalNotes: null,
    implementationInstructions: null, parent: null, visualReferences: [], dependencies: [],
    acceptanceCriteria: [{ id: 'criterion-1', text: 'Done', satisfied: false }] },
  execution: { node: { id: 'node-1', name: 'MIRIAM' },
    agent: { id: 'agent-1', name: 'Codex', type: 'Codex', version: '0.152.0' },
    model: { id: 'model-1', displayName: 'Default', provider: 'OpenAI', identifier: 'codex-cli-default' } },
  expectations: { tests: ['Unit', 'Integration', 'EndToEnd'], deploymentRequired: true, visualReviewRequired: false },
};

const result: CodexExecutionResult = {
  summary: 'Done', tests: [
    { type: 'Unit', result: 'Passed', testCount: 1, failedTests: [], durationMs: 10 },
    { type: 'Integration', result: 'Passed', testCount: 1, failedTests: [], durationMs: 20 },
    { type: 'EndToEnd', result: 'Passed', testCount: 1, failedTests: [], durationMs: 30 },
  ], visualEvidence: [],
  deployment: { environment: 'Production', status: 'Succeeded', version: 'abc', commitHash: 'abc', url: 'https://app.test' },
  satisfiedAcceptanceCriterionIds: ['criterion-1'], branchName: 'main', commitHash: 'abc', pullRequestUrl: null,
};

describe('Codex worker HTTP lifecycle', () => {
  let server: Server | undefined;
  afterEach(() => { server?.close(); server = undefined; });

  it('authenticates and posts the complete ordered lifecycle over HTTP', async () => {
    const received: string[] = [];
    const authorizations: string[] = [];
    server = createServer((request, response) => {
      authorizations.push(request.headers.authorization ?? '');
      const path = request.url ?? '';
      if (path.endsWith('/heartbeat')) { response.writeHead(201, { 'Content-Type': 'application/json' }); response.end('{}'); return; }
      if (path.endsWith('/jobs')) { response.writeHead(200, { 'Content-Type': 'application/json' }); response.end('[{"id":"job-1","status":"Queued"}]'); return; }
      if (path.endsWith('/work-package')) { response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(work)); return; }
      received.push(path.split('/').at(-1) ?? '');
      response.writeHead(201, { 'Content-Type': 'application/json' }); response.end('{}');
    });
    await new Promise<void>((resolve) => { server?.listen(0, '127.0.0.1', resolve); });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Expected a TCP test server');
    const api = new AgentApi(`http://127.0.0.1:${String(address.port)}`, 'machine-token');
    const execute = vi.fn<WorkExecutor['execute']>((_work, _path, onProgress) => {
      onProgress?.({ phase: 'Codex', message: 'Analyzing the work item' });
      return Promise.resolve(result);
    });
    const worker = new CodexWorker(api, { execute }, 'node-1', new Map([[work.project.repositoryUrl ?? '', '/repo']]));

    await expect(worker.runNext()).resolves.toBe('job-1');
    expect(received).toEqual(['claim', 'start', 'progress', 'progress', 'tests', 'tests', 'deployment', 'tests', 'complete']);
    expect(authorizations.every((header) => header === 'Bearer machine-token')).toBe(true);
  });
});
