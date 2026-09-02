import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma.service.js';
import { AgentWorkPackageQueries, WorkPackageNotFoundError } from '../application/agent-work-package-queries.js';
import type { WorkPackage } from '../application/get-work-package.query.js';

const expectationsFor = (type: string): WorkPackage['expectations'] => {
  if (['Feature', 'UserStory', 'Bug'].includes(type)) {
    return { tests: ['Unit', 'Integration', 'EndToEnd'], deploymentRequired: true };
  }
  if (type === 'Research') return { tests: [], deploymentRequired: false };
  return { tests: ['Unit'], deploymentRequired: false };
};

@Injectable()
export class PrismaAgentWorkPackageQueries extends AgentWorkPackageQueries {
  constructor(private readonly database: PrismaService) { super(); }

  async get(jobId: string, nodeId: string): Promise<WorkPackage> {
    const job = await this.database.executionJob.findFirst({
      where: { id: jobId, executionNodeId: nodeId, status: {
        in: ['Assigned', 'Starting', 'Running', 'WaitingForInput', 'Blocked', 'Testing', 'Reviewing', 'Deploying', 'E2ETesting'],
      } },
      select: {
        id: true, protectedActionsApproved: true,
        executionNode: { select: { id: true, name: true } },
        agent: { select: { id: true, name: true, agentType: true, version: true } },
        model: { select: { id: true, displayName: true, provider: true, modelIdentifier: true } },
        workItem: { select: {
          id: true, type: true, title: true, description: true, technicalNotes: true, instructions: true,
          parent: { select: { id: true, title: true } },
          criteria: { orderBy: { sortOrder: 'asc' }, select: { id: true, text: true, satisfied: true } },
          dependencies: { select: { prerequisite: { select: { id: true, title: true, status: true } } } },
          project: { select: { id: true, key: true, name: true, description: true, businessGoal: true,
            repositoryUrl: true, defaultBranch: true } },
        } },
      },
    });
    if (!job) throw new WorkPackageNotFoundError('Claimed execution job not found for this node');
    return {
      executionJobId: job.id,
      authorization: { protectedActionsApproved: job.protectedActionsApproved },
      project: job.workItem.project,
      workItem: {
        id: job.workItem.id, type: job.workItem.type, title: job.workItem.title,
        description: job.workItem.description, technicalNotes: job.workItem.technicalNotes,
        implementationInstructions: job.workItem.instructions, parent: job.workItem.parent,
        acceptanceCriteria: job.workItem.criteria,
        dependencies: job.workItem.dependencies.map((dependency) => dependency.prerequisite),
      },
      execution: {
        node: job.executionNode,
        agent: { id: job.agent.id, name: job.agent.name, type: job.agent.agentType, version: job.agent.version },
        model: { id: job.model.id, displayName: job.model.displayName,
          provider: job.model.provider, identifier: job.model.modelIdentifier },
      },
      expectations: expectationsFor(job.workItem.type),
    };
  }
}
