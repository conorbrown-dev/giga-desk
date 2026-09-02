import { Command } from '@nestjs/cqrs';

export interface StartedExecution { id: string; status: 'Running'; startedAt: string }
export class StartExecutionCommand extends Command<StartedExecution> {
  constructor(readonly jobId: string, readonly nodeId: string, readonly actorId: string) { super(); }
}
