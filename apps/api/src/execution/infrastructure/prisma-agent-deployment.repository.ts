import { Injectable } from '@nestjs/common';
import { Prisma, type Deployment, type TestType } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/infrastructure/prisma.service.js';
import { AgentDeploymentRepository } from '../application/agent-deployment-repository.js';
import { AgentExecutionNotFoundError } from '../application/agent-execution-repository.js';
import type { ReportDeploymentCommand, StoredDeployment } from '../application/report-deployment.command.js';
import { assertCanReportDeployment } from '../domain/agent-deployment-state.js';

const toDeployment = (deployment: Deployment): StoredDeployment => ({
  id: deployment.id, environment: deployment.environment, status: deployment.status,
  version: deployment.version, commitHash: deployment.commitHash, url: deployment.url,
  failureReason: deployment.failureReason, startedAt: deployment.startedAt.toISOString(),
  completedAt: deployment.completedAt?.toISOString() ?? null,
});

@Injectable()
export class PrismaAgentDeploymentRepository extends AgentDeploymentRepository {
  constructor(private readonly database: PrismaService) { super(); }

  async report(command: ReportDeploymentCommand): Promise<StoredDeployment> {
    const job = await this.database.executionJob.findFirst({
      where: { id: command.jobId, executionNodeId: command.nodeId },
      select: { status: true, workItemId: true, executionNodeId: true,
        workItem: { select: { projectId: true, status: true } },
        testResults: { orderBy: { createdAt: 'desc' }, select: { type: true, result: true } } },
    });
    if (!job) throw new AgentExecutionNotFoundError('Execution job not found for this node');
    const existing = await this.database.deployment.findUnique({ where: {
      executionJobId_idempotencyKey: { executionJobId: command.jobId, idempotencyKey: command.idempotencyKey },
    } });
    if (existing) return toDeployment(existing);
    const latestTests = Object.fromEntries(
      (['Unit', 'Integration'] as const).map((type) => [type, job.testResults.find((test) => test.type === type)?.result]),
    ) as Partial<Record<TestType, 'Passed' | 'Failed'>>;
    assertCanReportDeployment(job.status, latestTests);
    try {
      return await this.database.$transaction(async (transaction) => {
        const terminal = ['Failed', 'RolledBack'].includes(command.input.status);
        const completed = terminal || command.input.status === 'Succeeded';
        const deployment = await transaction.deployment.create({ data: {
          projectId: job.workItem.projectId, workItemId: job.workItemId, executionJobId: command.jobId,
          ...command.input, idempotencyKey: command.idempotencyKey, completedAt: completed ? new Date() : null,
        } });
        const jobStatus = terminal ? 'Failed' : command.input.status === 'Succeeded' ? 'E2ETesting' : 'Deploying';
        const workItemStatus = terminal ? 'Blocked' : command.input.status === 'Succeeded' ? 'E2ETesting' : 'Deploying';
        await transaction.executionJob.update({ where: { id: command.jobId }, data: {
          status: jobStatus, ...(terminal ? { completedAt: new Date(), failureReason: command.input.failureReason } : {}),
        } });
        await transaction.workItem.update({ where: { id: job.workItemId }, data: { status: workItemStatus } });
        if (terminal) await transaction.executionNode.update({ where: { id: job.executionNodeId },
          data: { currentJobCount: { decrement: 1 } } });
        await transaction.activity.createMany({ data: [
          { projectId: job.workItem.projectId, workItemId: job.workItemId, actorId: command.actorId,
            eventType: 'DeploymentReported', metadata: { executionJobId: command.jobId,
              environment: command.input.environment, status: command.input.status } },
          { projectId: job.workItem.projectId, workItemId: job.workItemId, actorId: command.actorId,
            eventType: 'WorkItemStatusChanged', metadata: { from: job.workItem.status, to: workItemStatus } },
        ] });
        return toDeployment(deployment);
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      return toDeployment(await this.database.deployment.findUniqueOrThrow({ where: {
        executionJobId_idempotencyKey: { executionJobId: command.jobId, idempotencyKey: command.idempotencyKey },
      } }));
    }
  }
}
