import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma.service.js';
import { AgentExecutionNotFoundError } from '../application/agent-execution-repository.js';
import { AgentFailureRepository, ExecutionFailureRejectedError } from '../application/agent-failure-repository.js';
import type { FailedExecution, ReportExecutionFailureCommand } from '../application/report-execution-failure.command.js';

@Injectable()
export class PrismaAgentFailureRepository extends AgentFailureRepository {
  constructor(private readonly database: PrismaService) { super(); }
  async report(command: ReportExecutionFailureCommand): Promise<FailedExecution> {
    const job = await this.database.executionJob.findFirst({ where: { id: command.jobId, executionNodeId: command.nodeId },
        select: { status: true, workItemId: true, executionNodeId: true, failureReason: true, completedAt: true, result: true,
        workItem: { select: { projectId: true, status: true } } } });
    if (!job) throw new AgentExecutionNotFoundError('Execution job not found for this node');
    const result = typeof job.result === 'object' && job.result !== null && !Array.isArray(job.result) ? job.result as Record<string, unknown> : null;
    if (job.status === 'Failed' && result?.['failureIdempotencyKey'] === command.idempotencyKey && job.completedAt) {
      return { id: command.jobId, status: 'Failed', completedAt: job.completedAt.toISOString(), failureReason: job.failureReason ?? command.failureReason };
    }
    if (['Completed', 'Failed'].includes(job.status)) throw new ExecutionFailureRejectedError('Execution is already terminal');
    const completedAt = new Date();
    return this.database.$transaction(async (transaction) => {
      const execution = await transaction.executionJob.updateMany({
        where: { id: command.jobId, executionNodeId: command.nodeId, status: job.status },
        data: { status: 'Failed', completedAt, failureReason: command.failureReason, result: { failureIdempotencyKey: command.idempotencyKey } },
      });
      const workItem = await transaction.workItem.updateMany({ where: { id: job.workItemId, status: job.workItem.status }, data: { status: 'Blocked' } });
      const node = await transaction.executionNode.updateMany({ where: { id: job.executionNodeId, currentJobCount: { gt: 0 } }, data: { currentJobCount: { decrement: 1 } } });
      if (execution.count !== 1 || workItem.count !== 1 || node.count !== 1) throw new ExecutionFailureRejectedError('Execution failure changed concurrently');
      await transaction.activity.createMany({ data: [
        { projectId: job.workItem.projectId, workItemId: job.workItemId, actorId: command.actorId, eventType: 'ExecutionFailed', metadata: { executionJobId: command.jobId, failureReason: command.failureReason, idempotencyKey: command.idempotencyKey } },
        { projectId: job.workItem.projectId, workItemId: job.workItemId, actorId: command.actorId, eventType: 'WorkItemStatusChanged', metadata: { from: job.workItem.status, to: 'Blocked' } },
      ] });
      return { id: command.jobId, status: 'Failed', completedAt: completedAt.toISOString(), failureReason: command.failureReason };
    });
  }
}
