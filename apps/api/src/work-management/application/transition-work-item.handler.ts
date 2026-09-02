import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { TransitionWorkItemCommand, type TransitionedWorkItem } from './transition-work-item.command.js';
import { WorkItemNotFoundError, WorkItemTransitionRepository } from './work-item-transition.repository.js';

@CommandHandler(TransitionWorkItemCommand)
export class TransitionWorkItemHandler implements ICommandHandler<TransitionWorkItemCommand> {
  constructor(private readonly workItems: WorkItemTransitionRepository) {}

  async execute(command: TransitionWorkItemCommand): Promise<TransitionedWorkItem> {
    const item = await this.workItems.get(command.workItemId);
    if (!item) throw new WorkItemNotFoundError('Work item not found');
    if (command.nextStatus === 'InProgress') {
      item.assertCanStart(await this.workItems.getPrerequisiteStatuses(command.workItemId));
    }
    const previousStatus = item.status;
    item.transitionTo(command.nextStatus);
    await this.workItems.commitStatus(item, previousStatus, command.requestedBy);
    return { id: item.props.id, status: item.status };
  }
}
