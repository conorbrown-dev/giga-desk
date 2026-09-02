import { Command } from '@nestjs/cqrs';
import type { VisualReferenceInput } from '../domain/work-item.js';

export interface CreatedFeature {
  id: string;
  projectId: string;
  type: 'Feature';
  title: string;
  description: string;
  status: 'Backlog';
  acceptanceCriteria: readonly string[];
  visualReferences: readonly { name: string; mediaType: string }[];
  visualReviewRequired: boolean;
}

export interface CreateFeatureInput {
  title: string;
  description: string;
  acceptanceCriteria: readonly string[];
  visualReferences?: readonly VisualReferenceInput[];
  visualReviewRequired?: boolean;
}

export class CreateFeatureCommand extends Command<CreatedFeature> {
  constructor(readonly projectId: string, readonly input: CreateFeatureInput, readonly requestedBy: string) {
    super();
  }
}
