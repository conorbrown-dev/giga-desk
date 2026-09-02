import { Command } from '@nestjs/cqrs';
export interface QueuedExecutionJob {
  id: string; workItemId: string; executionNodeId: string;
  agentId: string; modelId: string; status: 'Queued'; protectedActionsApproved: boolean;
}
export class CreateExecutionJobCommand extends Command<QueuedExecutionJob> {
  constructor(
    readonly workItemId: string, readonly executionNodeId: string, readonly agentId: string,
    readonly modelId: string, readonly protectedActionsApproved: boolean, readonly requestedBy: string,
  ) { super(); }
}
