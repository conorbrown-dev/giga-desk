import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma.service.js';
import { AgentJobRepository } from '../application/agent-job-repository.js';
import type { ClaimedExecutionJob } from '../application/claim-execution-job.command.js';
import type { DiscoverableJob } from '../application/discover-node-jobs.query.js';
import { JobClaimConflictError } from '../domain/job-claim.js';

@Injectable()
export class PrismaAgentJobRepository extends AgentJobRepository {
  constructor(private readonly database: PrismaService) { super(); }

  async discover(nodeId: string): Promise<readonly DiscoverableJob[]> {
    const jobs = await this.database.executionJob.findMany({
      where: { executionNodeId: nodeId, status: 'Queued', executionNode: { enabled: true } },
      orderBy: { requestedAt: 'asc' }, take: 20,
      select: { id: true, workItemId: true, requestedAt: true, workItem: {
        select: { title: true, projectId: true, project: { select: { key: true } } },
      } },
    });
    return jobs.map((job) => ({
      id: job.id, workItemId: job.workItemId, workItemTitle: job.workItem.title,
      projectId: job.workItem.projectId, projectKey: job.workItem.project.key,
      requestedAt: job.requestedAt.toISOString(), status: 'Queued',
    }));
  }

  async claim(jobId: string, nodeId: string, actorId: string): Promise<ClaimedExecutionJob> {
    return this.database.$transaction(async (transaction) => {
      const claimed = await transaction.executionJob.updateMany({
        where: { id: jobId, executionNodeId: nodeId, status: 'Queued', executionNode: { enabled: true } },
        data: { status: 'Assigned' },
      });
      if (claimed.count !== 1) throw new JobClaimConflictError('Execution job is not claimable by this node');
      const job = await transaction.executionJob.findUniqueOrThrow({
        where: { id: jobId }, select: { workItemId: true, workItem: { select: { projectId: true } } },
      });
      await transaction.activity.create({ data: {
        projectId: job.workItem.projectId, workItemId: job.workItemId, actorId,
        eventType: 'ExecutionJobClaimed', metadata: { executionJobId: jobId, executionNodeId: nodeId },
      } });
      return { id: jobId, status: 'Assigned' };
    });
  }
}
