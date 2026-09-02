import { randomUUID } from 'node:crypto';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { assertExecutionCanBeQueued } from '../domain/execution-selection.js';
import { CreateExecutionJobCommand, type QueuedExecutionJob } from './create-execution-job.command.js';
import { ExecutionJobRepository, ExecutionSelectionNotFoundError } from './execution-job-repository.js';

@CommandHandler(CreateExecutionJobCommand)
export class CreateExecutionJobHandler implements ICommandHandler<CreateExecutionJobCommand> {
  constructor(private readonly jobs: ExecutionJobRepository) {}

  async execute(command: CreateExecutionJobCommand): Promise<QueuedExecutionJob> {
    const selection = await this.jobs.loadSelection(
      command.workItemId, command.executionNodeId, command.agentId, command.modelId,
    );
    if (!selection) throw new ExecutionSelectionNotFoundError('Work item or execution target not found');
    assertExecutionCanBeQueued(selection);
    const job: QueuedExecutionJob = {
      id: randomUUID(), workItemId: command.workItemId, executionNodeId: command.executionNodeId,
      agentId: command.agentId, modelId: command.modelId, status: 'Queued',
      protectedActionsApproved: command.protectedActionsApproved,
    };
    await this.jobs.create(job, selection, command.requestedBy);
    return job;
  }
}
