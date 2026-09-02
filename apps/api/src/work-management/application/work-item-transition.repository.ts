import type { WorkItem, WorkItemStatus } from '../domain/work-item.js';

export class WorkItemNotFoundError extends Error {}
export class ConcurrentWorkItemTransitionError extends Error {}

export abstract class WorkItemTransitionRepository {
  abstract get(workItemId: string): Promise<WorkItem | null>;
  abstract getPrerequisiteStatuses(workItemId: string): Promise<readonly WorkItemStatus[]>;
  abstract commitStatus(item: WorkItem, previousStatus: WorkItemStatus, actorId: string): Promise<void>;
}
