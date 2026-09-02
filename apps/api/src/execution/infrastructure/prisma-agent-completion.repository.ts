import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma.service.js';
import { AgentCompletionRepository, ConcurrentExecutionCompletionError } from '../application/agent-completion-repository.js';
import type { CompleteExecutionCommand, CompletedExecution } from '../application/complete-execution.command.js';
import { AgentExecutionNotFoundError } from '../application/agent-execution-repository.js';
import { assertExecutionCanComplete } from '../domain/execution-completion.js';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

@Injectable()
export class PrismaAgentCompletionRepository extends AgentCompletionRepository {
  constructor(private readonly database: PrismaService) { super(); }

  async complete(command: CompleteExecutionCommand): Promise<CompletedExecution> {
    const job = await this.database.executionJob.findFirst({
      where: { id: command.jobId, executionNodeId: command.nodeId }, select: {
        status: true, result: true, completedAt: true, workItemId: true, executionNodeId: true,
        workItem: { select: { projectId: true, status: true, criteria: { select: { id: true } } } },
        testResults: { orderBy: { createdAt: 'desc' }, select: { type: true, result: true } },
        deployments: { orderBy: { startedAt: 'desc' }, take: 1, select: { status: true } },
      },
    });
    if (!job) throw new AgentExecutionNotFoundError('Execution job not found for this node');
    if (job.status === 'Completed' && job.completedAt && isRecord(job.result)
      && job.result['idempotencyKey'] === command.input.idempotencyKey) {
      return { id: command.jobId, status: 'Completed', completedAt: job.completedAt.toISOString() };
    }
    const latestTests: Partial<Record<'Unit' | 'Integration' | 'EndToEnd', 'Passed' | 'Failed'>> = {};
    for (const type of ['Unit', 'Integration', 'EndToEnd'] as const) {
      const result = job.testResults.find((test) => test.type === type)?.result;
      if (result) latestTests[type] = result;
    }
    assertExecutionCanComplete({
      jobStatus: job.status, acceptanceCriterionIds: job.workItem.criteria.map((criterion) => criterion.id),
      satisfiedCriterionIds: command.input.satisfiedAcceptanceCriterionIds,
      latestTests, deploymentStatus: job.deployments[0]?.status ?? null,
    });
    const completedAt = new Date();
    return this.database.$transaction(async (transaction) => {
      const execution = await transaction.executionJob.updateMany({
        where: { id: command.jobId, executionNodeId: command.nodeId, status: 'E2ETesting' },
        data: { status: 'Completed', completedAt, result: { summary: command.input.summary,
          idempotencyKey: command.input.idempotencyKey }, branchName: command.input.branchName,
          commitHash: command.input.commitHash, pullRequestUrl: command.input.pullRequestUrl },
      });
      const workItem = await transaction.workItem.updateMany({
        where: { id: job.workItemId, status: 'E2ETesting' }, data: { status: 'Completed', completedAt },
      });
      const node = await transaction.executionNode.updateMany({
        where: { id: job.executionNodeId, currentJobCount: { gt: 0 } }, data: { currentJobCount: { decrement: 1 } },
      });
      if (execution.count !== 1 || workItem.count !== 1 || node.count !== 1) {
        throw new ConcurrentExecutionCompletionError('Execution completion changed concurrently');
      }
      await transaction.acceptanceCriterion.updateMany({
        where: { workItemId: job.workItemId, id: { in: [...command.input.satisfiedAcceptanceCriterionIds] } },
        data: { satisfied: true },
      });
      await transaction.activity.createMany({ data: [
        { projectId: job.workItem.projectId, workItemId: job.workItemId, actorId: command.actorId,
          eventType: 'ExecutionCompleted', metadata: { executionJobId: command.jobId } },
        { projectId: job.workItem.projectId, workItemId: job.workItemId, actorId: command.actorId,
          eventType: 'WorkItemStatusChanged', metadata: { from: 'E2ETesting', to: 'Completed' } },
      ] });
      return { id: command.jobId, status: 'Completed', completedAt: completedAt.toISOString() };
    });
  }
}
