import type { CompleteExecutionCommand, CompletedExecution } from './complete-execution.command.js';

export class ConcurrentExecutionCompletionError extends Error {}
export abstract class AgentCompletionRepository {
  abstract complete(command: CompleteExecutionCommand): Promise<CompletedExecution>;
}
