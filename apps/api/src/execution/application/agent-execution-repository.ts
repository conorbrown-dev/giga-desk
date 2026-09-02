import type { ReportedProgress } from './report-progress.command.js';
import type { StartedExecution } from './start-execution.command.js';

export class AgentExecutionNotFoundError extends Error {}
export abstract class AgentExecutionRepository {
  abstract start(jobId: string, nodeId: string, actorId: string): Promise<StartedExecution>;
  abstract reportProgress(jobId: string, nodeId: string, phase: string, message: string,
    idempotencyKey: string): Promise<ReportedProgress>;
}
