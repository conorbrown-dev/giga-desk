import { Command } from '@nestjs/cqrs';

export interface FailedExecution { id: string; status: 'Failed'; completedAt: string; failureReason: string }
export class ReportExecutionFailureCommand extends Command<FailedExecution> {
  constructor(readonly jobId: string, readonly nodeId: string, readonly actorId: string,
    readonly failureReason: string, readonly idempotencyKey: string) { super(); }
}
