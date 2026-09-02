import type { ReportDeploymentCommand, StoredDeployment } from './report-deployment.command.js';

export abstract class AgentDeploymentRepository {
  abstract report(command: ReportDeploymentCommand): Promise<StoredDeployment>;
}
