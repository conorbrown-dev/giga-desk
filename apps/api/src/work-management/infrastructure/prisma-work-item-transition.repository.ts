import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma.service.js';
import { WorkItem } from '../domain/work-item.js';
import type { WorkItemStatus } from '../domain/work-item.js';
import { ConcurrentWorkItemTransitionError, WorkItemTransitionRepository } from '../application/work-item-transition.repository.js';

@Injectable()
export class PrismaWorkItemTransitionRepository extends WorkItemTransitionRepository {
  constructor(private readonly database: PrismaService) {
    super();
  }

  async get(workItemId: string): Promise<WorkItem | null> {
    const record = await this.database.workItem.findUnique({
      where: { id: workItemId }, include: { criteria: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!record) return null;
    return WorkItem.create({
      id: record.id,
      projectId: record.projectId,
      ...(record.parentId ? { parentId: record.parentId } : {}),
      type: record.type,
      title: record.title,
      description: record.description,
      status: record.status,
      acceptanceCriteria: record.criteria.map((criterion) => criterion.text),
    });
  }

  async getPrerequisiteStatuses(workItemId: string): Promise<readonly WorkItemStatus[]> {
    const dependencies = await this.database.workItemDependency.findMany({
      where: { workItemId }, select: { prerequisite: { select: { status: true } } },
    });
    return dependencies.map((dependency) => dependency.prerequisite.status);
  }

  async commitStatus(item: WorkItem, previousStatus: WorkItemStatus, actorId: string): Promise<void> {
    await this.database.$transaction(async (transaction) => {
      const updated = await transaction.workItem.updateMany({
        where: { id: item.props.id, status: previousStatus },
        data: {
          status: item.status,
          ...(item.status === 'InProgress' ? { startedAt: new Date() } : {}),
          ...(item.status === 'Completed' ? { completedAt: new Date() } : {}),
        },
      });
      if (updated.count !== 1) throw new ConcurrentWorkItemTransitionError('Work item changed concurrently');
      await transaction.activity.create({ data: {
        projectId: item.props.projectId,
        workItemId: item.props.id,
        actorId,
        eventType: 'WorkItemStatusChanged',
        metadata: { from: previousStatus, to: item.status },
      } });
    });
  }
}
