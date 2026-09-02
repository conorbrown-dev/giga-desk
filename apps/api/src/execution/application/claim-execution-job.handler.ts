import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { AgentJobRepository } from './agent-job-repository.js';
import { ClaimExecutionJobCommand, type ClaimedExecutionJob } from './claim-execution-job.command.js';

@CommandHandler(ClaimExecutionJobCommand)
export class ClaimExecutionJobHandler implements ICommandHandler<ClaimExecutionJobCommand> {
  constructor(private readonly jobs: AgentJobRepository) {}
  execute(command: ClaimExecutionJobCommand): Promise<ClaimedExecutionJob> {
    return this.jobs.claim(command.jobId, command.nodeId, command.claimedBy);
  }
}
