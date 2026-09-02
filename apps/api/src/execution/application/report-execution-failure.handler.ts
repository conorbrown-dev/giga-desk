import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { AgentFailureRepository } from './agent-failure-repository.js';
import { ReportExecutionFailureCommand, type FailedExecution } from './report-execution-failure.command.js';

@CommandHandler(ReportExecutionFailureCommand)
export class ReportExecutionFailureHandler implements ICommandHandler<ReportExecutionFailureCommand> {
  constructor(private readonly failures: AgentFailureRepository) {}
  execute(command: ReportExecutionFailureCommand): Promise<FailedExecution> { return this.failures.report(command); }
}
