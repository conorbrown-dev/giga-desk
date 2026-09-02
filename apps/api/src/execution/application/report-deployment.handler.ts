import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { AgentDeploymentRepository } from './agent-deployment-repository.js';
import { ReportDeploymentCommand, type StoredDeployment } from './report-deployment.command.js';

@CommandHandler(ReportDeploymentCommand)
export class ReportDeploymentHandler implements ICommandHandler<ReportDeploymentCommand> {
  constructor(private readonly deployments: AgentDeploymentRepository) {}
  execute(command: ReportDeploymentCommand): Promise<StoredDeployment> { return this.deployments.report(command); }
}
