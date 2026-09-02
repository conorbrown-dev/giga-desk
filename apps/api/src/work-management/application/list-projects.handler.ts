import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { ListProjectsQuery, type ProjectListItem } from './list-projects.query.js';
import { ProjectQueries } from './project-queries.js';

@QueryHandler(ListProjectsQuery)
export class ListProjectsHandler implements IQueryHandler<ListProjectsQuery> {
  constructor(private readonly projects: ProjectQueries) {}

  execute(): Promise<readonly ProjectListItem[]> {
    return this.projects.listActive();
  }
}
