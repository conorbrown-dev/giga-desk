import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/infrastructure/prisma.service.js';
import { ProjectKeyConflictError, ProjectRepository } from '../application/project-repository.js';
import type { Project } from '../domain/project.js';

@Injectable()
export class PrismaProjectRepository extends ProjectRepository {
  constructor(private readonly database: PrismaService) {
    super();
  }

  async create(project: Project, actorId: string): Promise<void> {
    try {
      await this.database.project.create({ data: {
        ...project.props,
        activities: { create: {
          actorId,
          eventType: 'ProjectCreated',
          metadata: { key: project.props.key, name: project.props.name },
        } },
      } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ProjectKeyConflictError();
      }
      throw error;
    }
  }
}
