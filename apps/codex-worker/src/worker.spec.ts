import type { DiscoverableJob, WorkPackage } from '@giga-desk/agent-client/agent-api';
import { describe, expect, it, vi } from 'vitest';
import type { CodexExecutionResult } from './codex-executor.js';
import { CodexWorker, type WorkerApi, type WorkExecutor } from './worker.js';

const work: WorkPackage = {
  executionJobId: 'job-1',
  authorization: { protectedActionsApproved: false },
  project: { id: 'project-1', key: 'GD', name: 'Giga Desk', description: 'Plan', businessGoal: 'Ship',
    repositoryUrl: 'https://github.com/conorbrown-dev/giga-desk.git', defaultBranch: 'main' },
  workItem: { id: 'work-1', type: 'Feature', title: 'Execute work', description: 'Do it', technicalNotes: null,
    implementationInstructions: null, parent: null, dependencies: [],
    acceptanceCriteria: [{ id: 'criterion-1', text: 'Done', satisfied: false }] },
  execution: { node: { id: 'node-1', name: 'MIRIAM' },
    agent: { id: 'agent-1', name: 'Codex', type: 'Codex', version: '0.152.0' },
    model: { id: 'model-1', displayName: 'Default', provider: 'OpenAI', identifier: 'codex-cli-default' } },
  expectations: { tests: ['Unit', 'Integration', 'EndToEnd'], deploymentRequired: true },
};

const result: CodexExecutionResult = {
  summary: 'Done', tests: [
    { type: 'Unit', result: 'Passed', testCount: 2, failedTests: [], durationMs: 10 },
    { type: 'Integration', result: 'Passed', testCount: 1, failedTests: [], durationMs: 20 },
    { type: 'EndToEnd', result: 'Passed', testCount: 1, failedTests: [], durationMs: 30 },
  ],
  deployment: { environment: 'Production', status: 'Succeeded', version: 'abc', commitHash: 'abc', url: 'https://app.test' },
  satisfiedAcceptanceCriterionIds: ['criterion-1'], branchName: 'main', commitHash: 'abc', pullRequestUrl: null,
};

const fakeApi = (jobs: readonly DiscoverableJob[]) => {
  const actions: string[] = [];
  const heartbeat = vi.fn<WorkerApi['heartbeat']>().mockResolvedValue({});
  const discover = vi.fn<WorkerApi['discover']>().mockResolvedValue(jobs);
  const workPackage = vi.fn<WorkerApi['workPackage']>().mockResolvedValue(work);
  const post = vi.fn<WorkerApi['post']>((_jobId, action) => {
    actions.push(action);
    return Promise.resolve({});
  });
  const api: WorkerApi = {
    heartbeat, discover, workPackage, post,
  };
  return { api, actions, heartbeat };
};

describe('CodexWorker', () => {
  it('heartbeats without claiming when the queue is empty', async () => {
    const { api, actions, heartbeat } = fakeApi([]);
    const executor: WorkExecutor = { execute: vi.fn() };
    await expect(new CodexWorker(api, executor, 'node-1', 'repo', '/repo').runNext()).resolves.toBeNull();
    expect(heartbeat).toHaveBeenCalledWith('node-1');
    expect(actions).toEqual([]);
  });

  it('reports real evidence in the API-required lifecycle order', async () => {
    const { api, actions } = fakeApi([{ id: 'job-1', status: 'Queued' }]);
    const execute = vi.fn<WorkExecutor['execute']>().mockResolvedValue(result);
    const executor: WorkExecutor = { execute };
    const worker = new CodexWorker(api, executor, 'node-1', work.project.repositoryUrl ?? '', '/repo');

    await expect(worker.runNext()).resolves.toBe('job-1');
    expect(actions).toEqual(['claim', 'start', 'progress', 'tests', 'tests', 'deployment', 'tests', 'complete']);
    expect(execute).toHaveBeenCalledWith(work, '/repo');
  });

  it('fails a claimed job before execution when its repository is not approved', async () => {
    const { api, actions } = fakeApi([{ id: 'job-1', status: 'Queued' }]);
    const execute = vi.fn<WorkExecutor['execute']>();
    const executor: WorkExecutor = { execute };
    const worker = new CodexWorker(api, executor, 'node-1', 'https://github.com/other/repo.git', '/repo');

    await expect(worker.runNext()).rejects.toThrow('not approved');
    expect(actions).toEqual(['claim', 'fail']);
    expect(execute).not.toHaveBeenCalled();
  });

  it('requires explicit approval before a protected production task can execute', async () => {
    const { api, actions } = fakeApi([{ id: 'job-1', status: 'Queued' }]);
    const sensitiveWork: WorkPackage = { ...work, workItem: {
      ...work.workItem, description: 'Apply a Prisma migration to the production database',
    } };
    api.workPackage = vi.fn().mockResolvedValue(sensitiveWork);
    const execute = vi.fn<WorkExecutor['execute']>();
    const worker = new CodexWorker(api, { execute }, 'node-1', work.project.repositoryUrl ?? '', '/repo');

    await expect(worker.runNext()).rejects.toThrow('explicit approval');
    expect(actions).toEqual(['claim', 'fail']);
    expect(execute).not.toHaveBeenCalled();
  });

  it('executes a reviewed protected task when its approval is persisted', async () => {
    const { api, actions } = fakeApi([{ id: 'job-1', status: 'Queued' }]);
    const sensitiveWork: WorkPackage = { ...work, authorization: { protectedActionsApproved: true }, workItem: {
      ...work.workItem, description: 'Apply a Prisma migration to the production database',
    } };
    api.workPackage = vi.fn().mockResolvedValue(sensitiveWork);
    const execute = vi.fn<WorkExecutor['execute']>().mockResolvedValue(result);
    const worker = new CodexWorker(api, { execute }, 'node-1', work.project.repositoryUrl ?? '', '/repo');

    await expect(worker.runNext()).resolves.toBe('job-1');
    expect(actions.at(-1)).toBe('complete');
    expect(execute).toHaveBeenCalledWith(sensitiveWork, '/repo');
  });
});
