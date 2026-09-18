import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { AuthenticatedRequest } from '../../auth/interfaces/authentication.guard.js';
import { RequirePermissions } from '../../auth/interfaces/permissions.decorator.js';
import { ArchiveProjectCommand } from '../application/archive-project.command.js';
import { CreateProjectCommand, type CreatedProject } from '../application/create-project.command.js';
import { CreateFeatureCommand, type CreatedFeature, type CreateFeatureInput } from '../application/create-feature.command.js';
import { CreateWorkItemCommand, type CreatedWorkItem } from '../application/create-work-item.command.js';
import { ListProjectsQuery, type ProjectListItem } from '../application/list-projects.query.js';
import { ListProjectWorkItemsQuery, type ProjectWorkItemView } from '../application/list-project-work-items.query.js';
import { ProjectKeyConflictError } from '../application/project-repository.js';
import { ProjectNotFoundError } from '../application/project-not-found.error.js';
import { ProjectArchiveConfirmationError } from '../application/project-archive.error.js';
import { FeatureNotFoundError } from '../application/work-item-repository.js';
import { CreateFeatureDto, CreateWorkItemDto } from './create-feature.dto.js';
import { CreateProjectDto } from './create-project.dto.js';

const toFeatureInput = ({ visualReferences = [], ...input }: CreateFeatureDto): CreateFeatureInput => ({
  ...input,
  visualReferences: visualReferences.map(({ dataBase64, ...reference }) => ({
    ...reference, content: Buffer.from(dataBase64, 'base64'),
  })),
});

@Controller('projects')
export class ProjectsController {
  constructor(private readonly commands: CommandBus, private readonly queries: QueryBus) {}

  @Get()
  @RequirePermissions('projects:read')
  list(): Promise<readonly ProjectListItem[]> {
    return this.queries.execute(new ListProjectsQuery());
  }

  @Get(':projectId/work-items')
  @RequirePermissions('projects:read')
  async listWorkItems(@Param('projectId', ParseUUIDPipe) projectId: string): Promise<readonly ProjectWorkItemView[]> {
    try {
      return await this.queries.execute(new ListProjectWorkItemsQuery(projectId));
    } catch (error) {
      if (error instanceof ProjectNotFoundError) throw new NotFoundException(error.message);
      throw error;
    }
  }

  @Post(':projectId/features')
  @RequirePermissions('work-items:create')
  async createFeature(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() input: CreateFeatureDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<CreatedFeature> {
    if (!request.user) throw new Error('Authenticated principal was not attached');
    try {
      return await this.commands.execute(new CreateFeatureCommand(projectId, toFeatureInput(input), request.user.subject));
    } catch (error) {
      if (error instanceof ProjectNotFoundError) throw new NotFoundException(error.message);
      throw error;
    }
  }

  @Post(':projectId/features/:featureId/work-items')
  @RequirePermissions('work-items:create')
  async createWorkItem(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('featureId', ParseUUIDPipe) featureId: string,
    @Body() input: CreateWorkItemDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<CreatedWorkItem> {
    if (!request.user) throw new Error('Authenticated principal was not attached');
    try {
      return await this.commands.execute(new CreateWorkItemCommand(projectId, featureId, toFeatureInput(input), request.user.subject));
    } catch (error) {
      if (error instanceof FeatureNotFoundError) throw new NotFoundException(error.message);
      throw error;
    }
  }

  @Post(':projectId/archive')
  @RequirePermissions('projects:create')
  async archive(@Param('projectId', ParseUUIDPipe) projectId: string, @Body('projectName') projectName: string, @Req() request: AuthenticatedRequest): Promise<void> {
    if (!request.user) throw new Error('Authenticated principal was not attached');
    try {
      await this.commands.execute(new ArchiveProjectCommand(projectId, projectName, request.user.subject));
    } catch (error) {
      if (error instanceof ProjectArchiveConfirmationError) throw new BadRequestException(error.message);
      throw error;
    }
  }

  @Post()
  @RequirePermissions('projects:create')
  async create(@Body() input: CreateProjectDto, @Req() request: AuthenticatedRequest): Promise<CreatedProject> {
    if (!request.user) throw new Error('Authenticated principal was not attached');
    try {
      return await this.commands.execute(new CreateProjectCommand(input, request.user.subject));
    } catch (error) {
      if (error instanceof ProjectKeyConflictError) throw new ConflictException(error.message);
      throw error;
    }
  }
}
