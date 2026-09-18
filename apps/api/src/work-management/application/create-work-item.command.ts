import { Command } from '@nestjs/cqrs';
import type { CreateFeatureInput } from './create-feature.command.js';

export interface CreatedWorkItem {
  id: string;
  projectId: string;
  parentId: string;
  type: 'UserStory';
  title: string;
  status: 'Backlog';
}

export class CreateWorkItemCommand extends Command<CreatedWorkItem> {
  constructor(
    readonly projectId: string,
    readonly featureId: string,
    readonly input: CreateFeatureInput,
    readonly requestedBy: string,
  ) { super(); }
}
