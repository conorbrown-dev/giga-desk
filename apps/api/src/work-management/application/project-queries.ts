import type { ProjectListItem } from './list-projects.query.js';

export abstract class ProjectQueries {
  abstract listActive(): Promise<readonly ProjectListItem[]>;
}
