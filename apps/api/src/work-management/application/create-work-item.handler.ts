import { randomUUID } from 'node:crypto';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { WorkItem } from '../domain/work-item.js';
import { CreateWorkItemCommand, type CreatedWorkItem } from './create-work-item.command.js';
import { WorkItemRepository } from './work-item-repository.js';

@CommandHandler(CreateWorkItemCommand)
export class CreateWorkItemHandler implements ICommandHandler<CreateWorkItemCommand> {
  constructor(private readonly workItems: WorkItemRepository) {}

  async execute(command: CreateWorkItemCommand): Promise<CreatedWorkItem> {
    const workItem = WorkItem.create({
      id: randomUUID(), projectId: command.projectId, parentId: command.featureId,
      type: 'UserStory', status: 'Backlog', ...command.input,
    });
    await this.workItems.createWorkItem(workItem, command.requestedBy);
    return {
      id: workItem.props.id, projectId: workItem.props.projectId, parentId: command.featureId,
      type: 'UserStory', title: workItem.props.title, status: 'Backlog',
    };
  }
}
