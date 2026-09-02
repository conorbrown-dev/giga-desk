import type { ExecutionHistoryView } from './list-work-item-executions.query.js';
export abstract class WorkItemExecutionQueries {
  abstract list(workItemId: string): Promise<readonly ExecutionHistoryView[]>;
}
