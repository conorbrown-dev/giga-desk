import type { ProjectWorkItemView } from './list-project-work-items.query.js';

export abstract class WorkItemQueries {
  abstract listForProject(projectId: string): Promise<readonly ProjectWorkItemView[]>;
}
