import { Command } from '@nestjs/cqrs';

export interface ReportedProgress { id: string; phase: string; message: string; createdAt: string }
export class ReportProgressCommand extends Command<ReportedProgress> {
  constructor(readonly jobId: string, readonly nodeId: string, readonly actorId: string,
    readonly phase: string, readonly message: string, readonly idempotencyKey: string) { super(); }
}
