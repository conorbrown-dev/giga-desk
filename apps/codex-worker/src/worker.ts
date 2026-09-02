import type { DiscoverableJob, WorkPackage } from '@giga-desk/agent-client/agent-api';
import type { CodexExecutionResult } from './codex-executor.js';

export interface WorkerApi {
  heartbeat(nodeId: string): Promise<unknown>;
  discover(nodeId: string): Promise<readonly DiscoverableJob[]>;
  workPackage(jobId: string): Promise<WorkPackage>;
  post(jobId: string, action: string, body?: object): Promise<unknown>;
}

export interface WorkExecutor { execute(work: WorkPackage, repositoryPath: string): Promise<CodexExecutionResult> }

const evidenceKey = (jobId: string, stage: string): string => `codex-worker:${jobId}:${stage}`;

const validateEvidence = (work: WorkPackage, result: CodexExecutionResult): void => {
  const expectedTests = new Set(work.expectations.tests);
  const actualTests = new Set(result.tests.map(({ type }) => type));
  if (actualTests.size !== result.tests.length || expectedTests.size !== actualTests.size
    || [...expectedTests].some((type) => !actualTests.has(type))) {
    throw new Error('Codex evidence does not contain each expected test stage exactly once');
  }
  const expectedCriteria = new Set(work.workItem.acceptanceCriteria.map(({ id }) => id));
  const actualCriteria = new Set(result.satisfiedAcceptanceCriterionIds);
  if (actualCriteria.size !== result.satisfiedAcceptanceCriterionIds.length
    || expectedCriteria.size !== actualCriteria.size || [...expectedCriteria].some((id) => !actualCriteria.has(id))) {
    throw new Error('Codex evidence does not satisfy every acceptance criterion exactly once');
  }
};

const failureReason = (error: unknown): string => {
  const message = error instanceof Error ? error.message : 'Unknown Codex worker failure';
  return message.slice(0, 4_000);
};

export class CodexWorker {
  constructor(
    private readonly api: WorkerApi, private readonly executor: WorkExecutor,
    private readonly nodeId: string, private readonly repositoryUrl: string, private readonly repositoryPath: string,
  ) {}

  async runNext(): Promise<string | null> {
    await this.api.heartbeat(this.nodeId);
    const [job] = await this.api.discover(this.nodeId);
    if (!job) return null;
    await this.api.post(job.id, 'claim');
    try {
      const work = await this.api.workPackage(job.id);
      if (work.project.repositoryUrl !== this.repositoryUrl) {
        throw new Error('Work Package repository is not approved on this worker');
      }
      await this.api.post(job.id, 'start');
      await this.api.post(job.id, 'progress', {
        phase: 'Codex', message: `Executing ${work.workItem.title}`, idempotencyKey: evidenceKey(job.id, 'progress'),
      });
      const result = await this.executor.execute(work, this.repositoryPath);
      validateEvidence(work, result);
      for (const type of ['Unit', 'Integration'] as const) {
        const test = result.tests.find((candidate) => candidate.type === type);
        if (test) await this.api.post(job.id, 'tests', { ...test, idempotencyKey: evidenceKey(job.id, `test:${type}`) });
      }
      await this.api.post(job.id, 'deployment', {
        ...result.deployment, idempotencyKey: evidenceKey(job.id, 'deployment'),
      });
      const endToEnd = result.tests.find(({ type }) => type === 'EndToEnd');
      if (endToEnd) await this.api.post(job.id, 'tests', {
        ...endToEnd, idempotencyKey: evidenceKey(job.id, 'test:EndToEnd'),
      });
      await this.api.post(job.id, 'complete', {
        summary: result.summary, satisfiedAcceptanceCriterionIds: result.satisfiedAcceptanceCriterionIds,
        branchName: result.branchName, commitHash: result.commitHash, pullRequestUrl: result.pullRequestUrl,
        idempotencyKey: evidenceKey(job.id, 'complete'),
      });
      return job.id;
    } catch (error) {
      try {
        await this.api.post(job.id, 'fail', {
          failureReason: failureReason(error), idempotencyKey: evidenceKey(job.id, 'failure'),
        });
      } catch { /* Preserve the original execution error for the service log. */ }
      throw error;
    }
  }
}
