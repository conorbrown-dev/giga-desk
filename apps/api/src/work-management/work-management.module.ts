import { Module } from '@nestjs/common';
import { DatabaseModule } from '../shared/infrastructure/database.module.js';
import { CreateProjectHandler } from './application/create-project.handler.js';
import { ArchiveProjectHandler } from './application/archive-project.handler.js';
import { CreateFeatureHandler } from './application/create-feature.handler.js';
import { ListProjectsHandler } from './application/list-projects.handler.js';
import { ListProjectWorkItemsHandler } from './application/list-project-work-items.handler.js';
import { TransitionWorkItemHandler } from './application/transition-work-item.handler.js';
import { ProjectQueries } from './application/project-queries.js';
import { ProjectRepository } from './application/project-repository.js';
import { WorkItemRepository } from './application/work-item-repository.js';
import { WorkItemQueries } from './application/work-item-queries.js';
import { WorkItemTransitionRepository } from './application/work-item-transition.repository.js';
import { PrismaProjectRepository } from './infrastructure/prisma-project.repository.js';
import { PrismaWorkItemRepository } from './infrastructure/prisma-work-item.repository.js';
import { PrismaWorkItemQueries } from './infrastructure/prisma-work-item.queries.js';
import { PrismaWorkItemTransitionRepository } from './infrastructure/prisma-work-item-transition.repository.js';
import { PrismaProjectQueries } from './infrastructure/prisma-project.queries.js';
import { ProjectsController } from './interfaces/projects.controller.js';
import { WorkItemsController } from './interfaces/work-items.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ProjectsController, WorkItemsController],
  providers: [
    CreateProjectHandler,
    ArchiveProjectHandler,
    CreateFeatureHandler,
    ListProjectsHandler,
    ListProjectWorkItemsHandler,
    TransitionWorkItemHandler,
    { provide: ProjectRepository, useClass: PrismaProjectRepository },
    { provide: WorkItemRepository, useClass: PrismaWorkItemRepository },
    { provide: WorkItemQueries, useClass: PrismaWorkItemQueries },
    { provide: WorkItemTransitionRepository, useClass: PrismaWorkItemTransitionRepository },
    { provide: ProjectQueries, useClass: PrismaProjectQueries },
  ],
})
export class WorkManagementModule {}
