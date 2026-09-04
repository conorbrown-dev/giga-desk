import type { DiscoverableJob, WorkPackage } from '@giga-desk/agent-client/agent-api';
import type { CodexExecutionResult, CodexProgressUpdate, ExecutionProcessControl } from './codex-executor.js';

export interface WorkerApi {
  heartbeat(nodeId: string): Promise<unknown>;
  discover(nodeId: string): Promise<readonly DiscoverableJob[]>;
  workPackage(jobId: string): Promise<WorkPackage>;
  control(jobId: string): Promise<{ terminationRequested: boolean }>;
  post(jobId: string, action: string, body?: object): Promise<unknown>;
}

export interface WorkExecutor { execute(work: WorkPackage, repositoryPath: string, onProgress?: (update: CodexProgressUpdate) => void, control?: ExecutionProcessControl): Promise<CodexExecutionResult> }
export type ApprovedRepositories = ReadonlyMap<string, string>;

const evidenceKey = (jobId: string, stage: string): string => `codex-worker:${jobId}:${stage}`;

const protectedActionPatterns = [
  /\b(production|prod)\b.{0,50}\b(database|schema|migration|backfill|data)\b/i,
  /\b(database|schema|migration|backfill)\b.{0,50}\b(production|prod)\b/i,
  /\b(prisma\s+migrate|migrate\s+deploy|drop\s+(table|database)|truncate|alter\s+table|delete\s+from)\b/i,
  /\b(secret|credential|keycloak|auth0|dns|cloudflare|billing|paid resource|repository visibility)\b/i,
];

export const requiresProtectedActionApproval = (work: WorkPackage): boolean => {
  const text = [work.workItem.title, work.workItem.description, work.workItem.technicalNotes,
    work.workItem.implementationInstructions, ...work.workItem.acceptanceCriteria.map(({ text }) => text)]
    .filter((value): value is string => value !== null).join('\n');
  return protectedActionPatterns.some((pattern) => pattern.test(text));
};

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
    private readonly nodeId: string, private approvedRepositories: ApprovedRepositories,
  ) {}

  setApprovedRepositories(repositories: ApprovedRepositories): void { this.approvedRepositories = repositories; }

  async runNext(): Promise<string | null> {
    await this.api.heartbeat(this.nodeId);
    const [job] = await this.api.discover(this.nodeId);
    if (!job) return null;
    await this.api.post(job.id, 'claim');
    let progressWrites = Promise.resolve();
    const controlState: { terminationRequested: boolean; processRegistrationError?: unknown } = { terminationRequested: false };
    try {
      const work = await this.api.workPackage(job.id);
      const repositoryPath = work.project.repositoryUrl === null ? undefined : this.approvedRepositories.get(work.project.repositoryUrl);
      if (!repositoryPath) {
        throw new Error('Work Package repository is not approved on this worker');
      }
      if (requiresProtectedActionApproval(work) && !work.authorization.protectedActionsApproved) {
        throw new Error('Protected production actions require explicit approval before execution');
      }
      await this.api.post(job.id, 'start');
      await this.api.post(job.id, 'progress', {
        phase: work.execution.agent.type, message: `Executing ${work.workItem.title}`, idempotencyKey: evidenceKey(job.id, 'progress'),
      });
      let progressCount = 0;
      let previousProgress = '';
      const reportProgress = (update: CodexProgressUpdate): void => {
        const signature = `${update.phase}:${update.message}`;
        if (progressCount >= 100 || signature === previousProgress) return;
        previousProgress = signature;
        progressCount += 1;
        const sequence = progressCount;
        progressWrites = progressWrites.then(() => this.api.post(job.id, 'progress', {
          ...update, idempotencyKey: evidenceKey(job.id, `event:${String(sequence)}`),
        })).then(() => undefined).catch(() => undefined);
      };
      const abort = new AbortController();
      let processRegistration = Promise.resolve();
      const checkControl = async (): Promise<void> => {
        try {
          if ((await this.api.control(job.id)).terminationRequested) {
            controlState.terminationRequested = true;
            abort.abort();
          }
        } catch { /* A transient control poll failure must not fail valid work. */ }
      };
      const execution = this.executor.execute(work, repositoryPath, reportProgress, { signal: abort.signal,
        onStarted: (processId) => {
          processRegistration = this.api.post(job.id, 'process', { processId }).then(() => undefined);
          void processRegistration.then(checkControl).catch((error: unknown) => {
            controlState.processRegistrationError = error;
            abort.abort();
          });
        } });
      const controlTimer = setInterval(() => { void checkControl(); }, 1_000);
      let result: CodexExecutionResult;
      try { result = await execution; } finally { clearInterval(controlTimer); }
      await processRegistration;
      await checkControl();
      if (controlState.terminationRequested) throw new Error('Execution terminated by an authorized user');
      await progressWrites;
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
      await progressWrites;
      const executionError = controlState.terminationRequested ? new Error('Execution terminated by an authorized user')
        : controlState.processRegistrationError ?? error;
      try {
        await this.api.post(job.id, 'fail', {
          failureReason: failureReason(executionError), idempotencyKey: evidenceKey(job.id, 'failure'),
        });
      } catch { /* Preserve the original execution error for the service log. */ }
      throw executionError;
    }
  }
}
