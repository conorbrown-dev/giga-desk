import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/infrastructure/prisma.service.js';
import type { ExecutionSelection } from '../domain/execution-selection.js';
import type { QueuedExecutionJob } from '../application/create-execution-job.command.js';
import { ConcurrentExecutionRequestError, ExecutionJobRepository } from '../application/execution-job-repository.js';

const stringArray = (value: unknown, key: string): readonly string[] => {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || !(key in value)) return [];
  const candidate: unknown = (value as Record<string, unknown>)[key];
  return Array.isArray(candidate) ? candidate.filter((item): item is string => typeof item === 'string') : [];
};

export const repositoryUrls = (value: unknown): readonly string[] => {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || !('repositoryMappings' in value)) return [];
  const mappings: unknown = (value as Record<string, unknown>)['repositoryMappings'];
  return Array.isArray(mappings) ? mappings.flatMap((mapping) =>
    typeof mapping === 'object' && mapping !== null && !Array.isArray(mapping)
      && typeof (mapping as Record<string, unknown>)['url'] === 'string'
      && typeof (mapping as Record<string, unknown>)['path'] === 'string'
      && String((mapping as Record<string, unknown>)['path']).trim()
      ? [String((mapping as Record<string, unknown>)['url']).trim()] : []) : [];
};

@Injectable()
export class PrismaExecutionJobRepository extends ExecutionJobRepository {
  constructor(private readonly database: PrismaService) { super(); }

  async loadSelection(workItemId: string, nodeId: string, agentId: string, modelId: string): Promise<ExecutionSelection | null> {
    const [workItem, node, agent, model, activeJob] = await Promise.all([
      this.database.workItem.findUnique({ where: { id: workItemId }, select: {
        projectId: true, status: true, project: { select: { repositoryUrl: true, defaultBranch: true } },
        dependencies: { select: { prerequisite: { select: { status: true } } } },
      } }),
      this.database.executionNode.findUnique({ where: { id: nodeId } }),
      this.database.agent.findUnique({ where: { id: agentId } }),
      this.database.aiModel.findUnique({ where: { id: modelId } }),
      this.database.executionJob.findFirst({ where: {
        workItemId, status: { notIn: ['Completed', 'Failed', 'Cancelled'] },
      }, select: { id: true } }),
    ]);
    if (!workItem || !node || !agent || !model) return null;
    return {
      projectId: workItem.projectId,
      workItemStatus: workItem.status,
      repositoryUrl: workItem.project.repositoryUrl,
      defaultBranch: workItem.project.defaultBranch,
      prerequisiteStatuses: workItem.dependencies.map((dependency) => dependency.prerequisite.status),
      hasActiveJob: activeJob !== null,
      node: {
        enabled: node.enabled, status: node.status, currentJobCount: node.currentJobCount,
        maximumConcurrentJobs: node.maximumConcurrentJobs,
        supportedAgentTypes: stringArray(node.capabilities, 'agentTypes'),
        supportedModelProviders: stringArray(node.capabilities, 'modelProviders'),
        approvedRepositoryUrls: repositoryUrls(node.capabilities),
      },
      agent: { enabled: agent.enabled, agentType: agent.agentType,
        supportedModelProviders: agent.supportedModelProviders },
      model: { enabled: model.enabled, provider: model.provider },
    };
  }

  async create(job: QueuedExecutionJob, selection: ExecutionSelection, requestedBy: string): Promise<void> {
    try {
      await this.database.$transaction(async (transaction) => {
        const node = await transaction.executionNode.updateMany({
          where: { id: job.executionNodeId, enabled: true, status: { in: ['Online', 'Busy'] },
            maximumConcurrentJobs: selection.node.maximumConcurrentJobs,
            currentJobCount: { lt: selection.node.maximumConcurrentJobs } },
          data: { currentJobCount: { increment: 1 } },
        });
        const agent = await transaction.agent.count({ where: {
          id: job.agentId, enabled: true, agentType: selection.agent.agentType,
          supportedModelProviders: { has: selection.model.provider },
        } });
        const model = await transaction.aiModel.count({ where: {
          id: job.modelId, enabled: true, provider: selection.model.provider,
        } });
        const workItem = await transaction.workItem.updateMany({
          where: { id: job.workItemId, status: selection.workItemStatus }, data: { status: 'Ready' },
        });
        if (node.count !== 1 || agent !== 1 || model !== 1 || workItem.count !== 1) {
          throw new ConcurrentExecutionRequestError('Execution selection changed concurrently');
        }
        await transaction.executionJob.create({ data: { ...job, requestedBy } });
        await transaction.activity.create({ data: {
          projectId: selection.projectId,
          workItemId: job.workItemId, actorId: requestedBy, eventType: 'ExecutionRequested',
          metadata: { executionJobId: job.id, executionNodeId: job.executionNodeId,
            agentId: job.agentId, modelId: job.modelId,
            protectedActionsApproved: job.protectedActionsApproved },
        } });
        if (selection.workItemStatus === 'Backlog') await transaction.activity.create({ data: {
          projectId: selection.projectId, workItemId: job.workItemId, actorId: requestedBy,
          eventType: 'WorkItemStatusChanged', metadata: { from: 'Backlog', to: 'Ready' },
        } });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConcurrentExecutionRequestError('Work item already has an active execution');
      }
      throw error;
    }
  }
}
