import { Command } from '@nestjs/cqrs';

export interface ClaimedExecutionJob { id: string; status: 'Assigned' }

export class ClaimExecutionJobCommand extends Command<ClaimedExecutionJob> {
  constructor(readonly jobId: string, readonly nodeId: string, readonly claimedBy: string) { super(); }
}
