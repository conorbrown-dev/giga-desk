import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { AgentExecutionRepository } from './agent-execution-repository.js';
import { ReportProgressCommand, type ReportedProgress } from './report-progress.command.js';

@CommandHandler(ReportProgressCommand)
export class ReportProgressHandler implements ICommandHandler<ReportProgressCommand> {
  constructor(private readonly executions: AgentExecutionRepository) {}
  execute(command: ReportProgressCommand): Promise<ReportedProgress> {
    return this.executions.reportProgress(
      command.jobId, command.nodeId, command.phase, command.message, command.idempotencyKey,
    );
  }
}
