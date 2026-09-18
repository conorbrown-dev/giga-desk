import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/infrastructure/prisma.service.js';
import { ProjectNotFoundError } from '../application/project-not-found.error.js';
import { FeatureNotFoundError, WorkItemRepository } from '../application/work-item-repository.js';
import type { WorkItem } from '../domain/work-item.js';

@Injectable()
export class PrismaWorkItemRepository extends WorkItemRepository {
  constructor(private readonly database: PrismaService) {
    super();
  }

  async createFeature(feature: WorkItem, actorId: string): Promise<void> {
    try {
      await this.database.$transaction(async (transaction) => {
        await transaction.workItem.create({ data: {
          id: feature.props.id,
          projectId: feature.props.projectId,
          type: 'Feature',
          title: feature.props.title,
          description: feature.props.description,
          visualReviewRequired: feature.props.visualReviewRequired ?? false,
          status: 'Backlog',
          criteria: { create: feature.props.acceptanceCriteria.map((text, sortOrder) => ({ text, sortOrder })) },
          visualReferences: { create: (feature.props.visualReferences ?? []).map((reference, sortOrder) => ({
            name: reference.name, mediaType: reference.mediaType, content: Buffer.from(reference.content), sortOrder,
          })) },
        } });
        await transaction.activity.create({ data: {
          projectId: feature.props.projectId,
          workItemId: feature.props.id,
          actorId,
          eventType: 'FeatureCreated',
          metadata: { title: feature.props.title },
        } });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ProjectNotFoundError();
      }
      throw error;
    }
  }

  async createWorkItem(workItem: WorkItem, actorId: string): Promise<void> {
    const parentId = workItem.props.parentId;
    if (!parentId) throw new FeatureNotFoundError();
    await this.database.$transaction(async (transaction) => {
      const feature = await transaction.workItem.findFirst({
        where: { id: parentId, projectId: workItem.props.projectId, type: 'Feature' }, select: { id: true },
      });
      if (!feature) throw new FeatureNotFoundError();
      await transaction.workItem.create({ data: {
        id: workItem.props.id, projectId: workItem.props.projectId, parentId, type: 'UserStory',
        title: workItem.props.title, description: workItem.props.description,
        visualReviewRequired: workItem.props.visualReviewRequired ?? false, status: 'Backlog',
        criteria: { create: workItem.props.acceptanceCriteria.map((text, sortOrder) => ({ text, sortOrder })) },
        visualReferences: { create: (workItem.props.visualReferences ?? []).map((reference, sortOrder) => ({
          name: reference.name, mediaType: reference.mediaType, content: Buffer.from(reference.content), sortOrder,
        })) },
      } });
      await transaction.activity.create({ data: {
        projectId: workItem.props.projectId, workItemId: workItem.props.id, actorId,
        eventType: 'WorkItemCreated', metadata: { title: workItem.props.title, featureId: parentId },
      } });
    });
  }
}
