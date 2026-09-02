import { Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { AuthenticatedRequest } from '../../auth/interfaces/authentication.guard.js';
import { RequirePermissions } from '../../auth/interfaces/permissions.decorator.js';
import { CreateExecutionJobCommand, type QueuedExecutionJob } from '../application/create-execution-job.command.js';
import { ConcurrentExecutionRequestError, ExecutionSelectionNotFoundError } from '../application/execution-job-repository.js';
import { InvalidExecutionSelectionError } from '../domain/execution-selection.js';
import { CreateExecutionJobDto } from './create-execution-job.dto.js';
import { ListWorkItemExecutionsQuery, type ExecutionHistoryView } from '../application/list-work-item-executions.query.js';

@Controller('work-items')
export class ExecutionJobsController {
  constructor(private readonly commands: CommandBus, private readonly queries: QueryBus) {}

  @Get(':workItemId/executions')
  @RequirePermissions('work-items:read')
  list(@Param('workItemId', ParseUUIDPipe) workItemId: string): Promise<readonly ExecutionHistoryView[]> {
    return this.queries.execute(new ListWorkItemExecutionsQuery(workItemId));
  }

  @Post(':workItemId/executions')
  @RequirePermissions('executions:create')
  async create(
    @Param('workItemId', ParseUUIDPipe) workItemId: string,
    @Body() input: CreateExecutionJobDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<QueuedExecutionJob> {
    if (!request.user) throw new Error('Authenticated principal was not attached');
    try {
      return await this.commands.execute(new CreateExecutionJobCommand(
        workItemId, input.executionNodeId, input.agentId, input.modelId, request.user.subject,
      ));
    } catch (error) {
      if (error instanceof ExecutionSelectionNotFoundError) throw new NotFoundException(error.message);
      if (error instanceof InvalidExecutionSelectionError || error instanceof ConcurrentExecutionRequestError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
