import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma.service.js';
import type { ProjectWorkItemView } from '../application/list-project-work-items.query.js';
import { ProjectNotFoundError } from '../application/project-not-found.error.js';
import { WorkItemQueries } from '../application/work-item-queries.js';

@Injectable()
export class PrismaWorkItemQueries extends WorkItemQueries {
  constructor(private readonly database: PrismaService) {
    super();
  }

  async listForProject(projectId: string): Promise<readonly ProjectWorkItemView[]> {
    const project = await this.database.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) throw new ProjectNotFoundError();
    return this.database.workItem.findMany({
      where: { projectId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true, parentId: true, type: true, title: true, status: true, priority: true,
        criteria: { orderBy: { sortOrder: 'asc' }, select: {
          id: true, text: true, satisfied: true, sortOrder: true,
        } },
      },
    });
  }
}
