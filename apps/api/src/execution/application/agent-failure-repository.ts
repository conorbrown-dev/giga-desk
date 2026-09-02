import type { ReportExecutionFailureCommand, FailedExecution } from './report-execution-failure.command.js';

export class ExecutionFailureRejectedError extends Error {}
export abstract class AgentFailureRepository {
  abstract report(command: ReportExecutionFailureCommand): Promise<FailedExecution>;
}
