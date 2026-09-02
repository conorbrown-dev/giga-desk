import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { AgentCompletionRepository } from './agent-completion-repository.js';
import { CompleteExecutionCommand, type CompletedExecution } from './complete-execution.command.js';

@CommandHandler(CompleteExecutionCommand)
export class CompleteExecutionHandler implements ICommandHandler<CompleteExecutionCommand> {
  constructor(private readonly completions: AgentCompletionRepository) {}
  execute(command: CompleteExecutionCommand): Promise<CompletedExecution> { return this.completions.complete(command); }
}
