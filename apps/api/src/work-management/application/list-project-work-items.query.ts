import { Query } from '@nestjs/cqrs';
import type { WorkItemStatus, WorkItemType } from '../domain/work-item.js';

export interface WorkItemCriterionView {
  id: string;
  text: string;
  satisfied: boolean;
  sortOrder: number;
}

export interface ProjectWorkItemView {
  id: string;
  parentId: string | null;
  type: WorkItemType;
  title: string;
  status: WorkItemStatus;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  criteria: readonly WorkItemCriterionView[];
}

export class ListProjectWorkItemsQuery extends Query<readonly ProjectWorkItemView[]> {
  constructor(readonly projectId: string) {
    super();
  }
}
