import { Command } from '@nestjs/cqrs';
export interface QueuedExecutionJob {
  id: string; workItemId: string; executionNodeId: string;
  agentId: string; modelId: string; status: 'Queued';
}
export class CreateExecutionJobCommand extends Command<QueuedExecutionJob> {
  constructor(
    readonly workItemId: string, readonly executionNodeId: string, readonly agentId: string,
    readonly modelId: string, readonly requestedBy: string,
  ) { super(); }
}
