import type { WorkItem } from '../domain/work-item.js';

export class FeatureNotFoundError extends Error {
  constructor() { super('Feature not found'); }
}

export abstract class WorkItemRepository {
  abstract createFeature(feature: WorkItem, actorId: string): Promise<void>;
  abstract createWorkItem(workItem: WorkItem, actorId: string): Promise<void>;
}
