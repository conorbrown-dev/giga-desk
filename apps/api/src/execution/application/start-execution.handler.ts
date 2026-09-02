import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { AgentExecutionRepository } from './agent-execution-repository.js';
import { StartExecutionCommand, type StartedExecution } from './start-execution.command.js';

@CommandHandler(StartExecutionCommand)
export class StartExecutionHandler implements ICommandHandler<StartExecutionCommand> {
  constructor(private readonly executions: AgentExecutionRepository) {}
  execute(command: StartExecutionCommand): Promise<StartedExecution> {
    return this.executions.start(command.jobId, command.nodeId, command.actorId);
  }
}
