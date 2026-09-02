import type { ExecutionSelection } from '../domain/execution-selection.js';
import type { QueuedExecutionJob } from './create-execution-job.command.js';
export class ExecutionSelectionNotFoundError extends Error {}
export class ConcurrentExecutionRequestError extends Error {}
export abstract class ExecutionJobRepository {
  abstract loadSelection(workItemId: string, nodeId: string, agentId: string, modelId: string): Promise<ExecutionSelection | null>;
  abstract create(job: QueuedExecutionJob, selection: ExecutionSelection, requestedBy: string): Promise<void>;
}
