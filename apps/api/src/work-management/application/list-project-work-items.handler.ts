import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { ListProjectWorkItemsQuery, type ProjectWorkItemView } from './list-project-work-items.query.js';
import { WorkItemQueries } from './work-item-queries.js';

@QueryHandler(ListProjectWorkItemsQuery)
export class ListProjectWorkItemsHandler implements IQueryHandler<ListProjectWorkItemsQuery> {
  constructor(private readonly workItems: WorkItemQueries) {}

  execute(query: ListProjectWorkItemsQuery): Promise<readonly ProjectWorkItemView[]> {
    return this.workItems.listForProject(query.projectId);
  }
}
