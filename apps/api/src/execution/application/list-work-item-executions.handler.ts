import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { WorkItemExecutionQueries } from './work-item-execution-queries.js';
import { ListWorkItemExecutionsQuery, type ExecutionHistoryView } from './list-work-item-executions.query.js';
@QueryHandler(ListWorkItemExecutionsQuery)
export class ListWorkItemExecutionsHandler implements IQueryHandler<ListWorkItemExecutionsQuery> {
  constructor(private readonly executions: WorkItemExecutionQueries) {}
  execute(query: ListWorkItemExecutionsQuery): Promise<readonly ExecutionHistoryView[]> { return this.executions.list(query.workItemId); }
}
