import { describe, expect, it } from 'vitest';
import type { WorkItem } from '../domain/work-item.js';
import { CreateFeatureCommand } from './create-feature.command.js';
import { CreateFeatureHandler } from './create-feature.handler.js';
import { WorkItemRepository } from './work-item-repository.js';

class RecordingWorkItemRepository extends WorkItemRepository {
  saved?: { feature: WorkItem; actorId: string };

  createFeature(feature: WorkItem, actorId: string): Promise<void> {
    this.saved = { feature, actorId };
    return Promise.resolve();
  }
}

describe('CreateFeatureHandler', () => {
  it('creates a backlog Feature and attributes it to the requesting identity', async () => {
    const repository = new RecordingWorkItemRepository();
    const handler = new CreateFeatureHandler(repository);
    const visualReference = { name: 'expo.png', mediaType: 'image/png' as const,
      content: Uint8Array.from([0x89, 0x50, 0x4e, 0x47]) };
    const result = await handler.execute(new CreateFeatureCommand('project-1', {
      title: ' Project board ', description: 'Show delivery state', acceptanceCriteria: [' Cards are visible '],
      visualReferences: [visualReference],
    }, 'user-123'));

    expect(result).toMatchObject({
      projectId: 'project-1', type: 'Feature', title: 'Project board', status: 'Backlog',
      acceptanceCriteria: ['Cards are visible'],
      visualReferences: [{ name: 'expo.png', mediaType: 'image/png' }],
    });
    expect(repository.saved?.feature.props.visualReferences).toEqual([visualReference]);
    expect(repository.saved?.actorId).toBe('user-123');
  });
});
