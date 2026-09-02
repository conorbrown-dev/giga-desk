import { Command } from '@nestjs/cqrs';
import type { WorkItemStatus } from '../domain/work-item.js';

export interface TransitionedWorkItem {
  id: string;
  status: WorkItemStatus;
}

export class TransitionWorkItemCommand extends Command<TransitionedWorkItem> {
  constructor(readonly workItemId: string, readonly nextStatus: WorkItemStatus, readonly requestedBy: string) {
    super();
  }
}
