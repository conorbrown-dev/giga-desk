import { Query } from '@nestjs/cqrs';
import type { ProjectStatus } from '../domain/project.js';

export interface ProjectListItem {
  id: string;
  key: string;
  name: string;
  businessGoal: string;
  status: ProjectStatus;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  updatedAt: string;
}

export class ListProjectsQuery extends Query<readonly ProjectListItem[]> {}
