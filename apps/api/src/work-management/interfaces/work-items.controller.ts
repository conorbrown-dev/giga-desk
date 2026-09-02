import { Body, ConflictException, Controller, NotFoundException, Param, ParseUUIDPipe, Patch, Req } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import type { AuthenticatedRequest } from '../../auth/interfaces/authentication.guard.js';
import { RequirePermissions } from '../../auth/interfaces/permissions.decorator.js';
import { TransitionWorkItemCommand, type TransitionedWorkItem } from '../application/transition-work-item.command.js';
import { ConcurrentWorkItemTransitionError, WorkItemNotFoundError } from '../application/work-item-transition.repository.js';
import { InvalidWorkItemTransitionError, UnfinishedPrerequisiteError } from '../domain/work-item.js';
import { TransitionWorkItemDto } from './transition-work-item.dto.js';

@Controller('work-items')
export class WorkItemsController {
  constructor(private readonly commands: CommandBus) {}

  @Patch(':workItemId/status')
  @RequirePermissions('work-items:update')
  async transition(
    @Param('workItemId', ParseUUIDPipe) workItemId: string,
    @Body() input: TransitionWorkItemDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<TransitionedWorkItem> {
    if (!request.user) throw new Error('Authenticated principal was not attached');
    try {
      return await this.commands.execute(new TransitionWorkItemCommand(workItemId, input.status, request.user.subject));
    } catch (error) {
      if (error instanceof WorkItemNotFoundError) throw new NotFoundException(error.message);
      if (error instanceof InvalidWorkItemTransitionError || error instanceof UnfinishedPrerequisiteError
        || error instanceof ConcurrentWorkItemTransitionError) throw new ConflictException(error.message);
      throw error;
    }
  }
}
