import { describe, expect, it } from 'vitest';
import type { WorkItem } from '../domain/work-item.js';
import { CreateWorkItemCommand } from './create-work-item.command.js';
import { CreateWorkItemHandler } from './create-work-item.handler.js';
import { WorkItemRepository } from './work-item-repository.js';

class RecordingWorkItemRepository extends WorkItemRepository {
  saved?: { workItem: WorkItem; actorId: string };
  createFeature(): Promise<void> { return Promise.resolve(); }
  createWorkItem(workItem: WorkItem, actorId: string): Promise<void> {
    this.saved = { workItem, actorId };
    return Promise.resolve();
  }
}

describe('CreateWorkItemHandler', () => {
  it('creates an assignable UserStory beneath the selected Feature', async () => {
    const repository = new RecordingWorkItemRepository();
    const result = await new CreateWorkItemHandler(repository).execute(new CreateWorkItemCommand(
      'project-1', 'feature-1', { title: ' Configure Prisma ', description: 'Set up the ORM',
        acceptanceCriteria: [' Prisma connects '] }, 'user-123',
    ));

    expect(result).toMatchObject({ projectId: 'project-1', parentId: 'feature-1', type: 'UserStory',
      title: 'Configure Prisma', status: 'Backlog' });
    expect(repository.saved?.workItem.props).toMatchObject({ parentId: 'feature-1', type: 'UserStory',
      acceptanceCriteria: ['Prisma connects'] });
    expect(repository.saved?.actorId).toBe('user-123');
  });
});
