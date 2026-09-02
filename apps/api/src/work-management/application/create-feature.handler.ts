import { randomUUID } from 'node:crypto';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { WorkItem } from '../domain/work-item.js';
import { CreateFeatureCommand, type CreatedFeature } from './create-feature.command.js';
import { WorkItemRepository } from './work-item-repository.js';

@CommandHandler(CreateFeatureCommand)
export class CreateFeatureHandler implements ICommandHandler<CreateFeatureCommand> {
  constructor(private readonly workItems: WorkItemRepository) {}

  async execute(command: CreateFeatureCommand): Promise<CreatedFeature> {
    const feature = WorkItem.create({
      id: randomUUID(), projectId: command.projectId, type: 'Feature', status: 'Backlog', ...command.input,
    });
    await this.workItems.createFeature(feature, command.requestedBy);
    return {
      id: feature.props.id,
      projectId: feature.props.projectId,
      type: 'Feature',
      title: feature.props.title,
      description: feature.props.description,
      status: 'Backlog',
      acceptanceCriteria: feature.props.acceptanceCriteria,
    };
  }
}
