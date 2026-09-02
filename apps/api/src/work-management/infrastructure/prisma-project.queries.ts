import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma.service.js';
import type { ProjectListItem } from '../application/list-projects.query.js';
import { ProjectQueries } from '../application/project-queries.js';

@Injectable()
export class PrismaProjectQueries extends ProjectQueries {
  constructor(private readonly database: PrismaService) {
    super();
  }

  async listActive(): Promise<readonly ProjectListItem[]> {
    const projects = await this.database.project.findMany({
      where: { archived: false },
      orderBy: [{ updatedAt: 'desc' }, { key: 'asc' }],
      take: 50,
      select: { id: true, key: true, name: true, businessGoal: true, status: true, priority: true, updatedAt: true },
    });
    return projects.map((project) => ({ ...project, updatedAt: project.updatedAt.toISOString() }));
  }
}
