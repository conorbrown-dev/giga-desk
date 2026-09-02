import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/infrastructure/prisma.service.js';
import { AgentExecutionNotFoundError, AgentExecutionRepository } from '../application/agent-execution-repository.js';
import type { ReportedProgress } from '../application/report-progress.command.js';
import type { StartedExecution } from '../application/start-execution.command.js';
import { assertCanReportProgress, assertCanStartExecution } from '../domain/agent-execution-state.js';

@Injectable()
export class PrismaAgentExecutionRepository extends AgentExecutionRepository {
  constructor(private readonly database: PrismaService) { super(); }

  async start(jobId: string, nodeId: string, actorId: string): Promise<StartedExecution> {
    return this.database.$transaction(async (transaction) => {
      const job = await transaction.executionJob.findFirst({
        where: { id: jobId, executionNodeId: nodeId }, select: {
          status: true, workItemId: true, workItem: { select: { projectId: true, status: true,
            dependencies: { select: { prerequisite: { select: { status: true } } } } } },
        },
      });
      if (!job) throw new AgentExecutionNotFoundError('Execution job not found for this node');
      assertCanStartExecution(job.status, job.workItem.status,
        job.workItem.dependencies.map((dependency) => dependency.prerequisite.status));
      const startedAt = new Date();
      await transaction.executionJob.update({ where: { id: jobId }, data: { status: 'Running', startedAt } });
      await transaction.workItem.update({ where: { id: job.workItemId },
        data: { status: 'InProgress', startedAt } });
      await transaction.activity.createMany({ data: [
        { projectId: job.workItem.projectId, workItemId: job.workItemId, actorId,
          eventType: 'ExecutionStarted', metadata: { executionJobId: jobId, executionNodeId: nodeId } },
        { projectId: job.workItem.projectId, workItemId: job.workItemId, actorId,
          eventType: 'WorkItemStatusChanged', metadata: { from: 'Ready', to: 'InProgress' } },
      ] });
      return { id: jobId, status: 'Running', startedAt: startedAt.toISOString() };
    });
  }

  async reportProgress(jobId: string, nodeId: string, phase: string, message: string,
    idempotencyKey: string): Promise<ReportedProgress> {
    const job = await this.database.executionJob.findFirst({
      where: { id: jobId, executionNodeId: nodeId }, select: { status: true },
    });
    if (!job) throw new AgentExecutionNotFoundError('Execution job not found for this node');
    assertCanReportProgress(job.status);
    try {
      const progress = await this.database.executionProgress.create({ data: {
        executionJobId: jobId, phase, message, idempotencyKey,
      } });
      return { id: progress.id, phase: progress.phase, message: progress.message,
        createdAt: progress.createdAt.toISOString() };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      const progress = await this.database.executionProgress.findUniqueOrThrow({
        where: { executionJobId_idempotencyKey: { executionJobId: jobId, idempotencyKey } },
      });
      return { id: progress.id, phase: progress.phase, message: progress.message,
        createdAt: progress.createdAt.toISOString() };
    }
  }
}
