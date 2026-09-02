import { Command } from '@nestjs/cqrs';

export interface CreatedFeature {
  id: string;
  projectId: string;
  type: 'Feature';
  title: string;
  description: string;
  status: 'Backlog';
  acceptanceCriteria: readonly string[];
}

export interface CreateFeatureInput {
  title: string;
  description: string;
  acceptanceCriteria: readonly string[];
}

export class CreateFeatureCommand extends Command<CreatedFeature> {
  constructor(readonly projectId: string, readonly input: CreateFeatureInput, readonly requestedBy: string) {
    super();
  }
}
