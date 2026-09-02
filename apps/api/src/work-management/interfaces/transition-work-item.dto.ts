import { IsIn } from 'class-validator';
import { WORK_ITEM_STATUSES, type WorkItemStatus } from '../domain/work-item.js';

export class TransitionWorkItemDto {
  @IsIn(WORK_ITEM_STATUSES)
  declare status: WorkItemStatus;
}
