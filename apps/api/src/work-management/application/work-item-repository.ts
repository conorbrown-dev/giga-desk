import type { WorkItem } from '../domain/work-item.js';

export abstract class WorkItemRepository {
  abstract createFeature(feature: WorkItem, actorId: string): Promise<void>;
}
