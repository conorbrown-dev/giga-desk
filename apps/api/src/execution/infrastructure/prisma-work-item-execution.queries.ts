import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma.service.js';
import { WorkItemExecutionQueries } from '../application/work-item-execution-queries.js';
import type { ExecutionHistoryView } from '../application/list-work-item-executions.query.js';
@Injectable()
export class PrismaWorkItemExecutionQueries extends WorkItemExecutionQueries {
  constructor(private readonly database: PrismaService) { super(); }
  async list(workItemId: string): Promise<readonly ExecutionHistoryView[]> {
    const jobs = await this.database.executionJob.findMany({ where: { workItemId }, orderBy: { requestedAt: 'desc' }, select: {
      id: true, status: true, requestedAt: true, startedAt: true, completedAt: true, failureReason: true, branchName: true, commitHash: true, pullRequestUrl: true,
      processId: true, processStartedAt: true, terminationRequestedAt: true,
      executionNode: { select: { id: true, name: true } }, agent: { select: { id: true, name: true, version: true } }, model: { select: { id: true, displayName: true, provider: true } },
      progress: { orderBy: { createdAt: 'asc' }, select: { phase: true, message: true, createdAt: true } }, testResults: { orderBy: { createdAt: 'asc' }, select: { type: true, result: true, testCount: true, createdAt: true } },
      deployments: { orderBy: { startedAt: 'asc' }, select: { environment: true, status: true, version: true, url: true, startedAt: true, completedAt: true } },
    } });
    return jobs.map((job) => ({ node: job.executionNode, agent: job.agent, model: job.model, id: job.id, status: job.status, failureReason: job.failureReason, branchName: job.branchName, commitHash: job.commitHash, pullRequestUrl: job.pullRequestUrl,
      requestedAt: job.requestedAt.toISOString(), startedAt: job.startedAt?.toISOString() ?? null, completedAt: job.completedAt?.toISOString() ?? null,
      process: job.processId && job.processStartedAt ? { id: job.processId, startedAt: job.processStartedAt.toISOString(), terminationRequestedAt: job.terminationRequestedAt?.toISOString() ?? null } : null,
      progress: job.progress.map((entry) => ({ ...entry, createdAt: entry.createdAt.toISOString() })), tests: job.testResults.map((test) => ({ ...test, createdAt: test.createdAt.toISOString() })),
      deployments: job.deployments.map((deployment) => ({ ...deployment, startedAt: deployment.startedAt.toISOString(), completedAt: deployment.completedAt?.toISOString() ?? null })),
    }));
  }
}
