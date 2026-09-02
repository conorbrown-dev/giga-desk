import type { ExecutionTargetRegistry } from './list-execution-targets.query.js';

export abstract class ExecutionTargetQueries {
  abstract listEnabled(): Promise<ExecutionTargetRegistry>;
}
