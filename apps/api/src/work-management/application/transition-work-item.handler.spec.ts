import { describe, expect, it } from 'vitest';
import { WorkItem, type WorkItemStatus } from '../domain/work-item.js';
import { TransitionWorkItemCommand } from './transition-work-item.command.js';
import { TransitionWorkItemHandler } from './transition-work-item.handler.js';
import { WorkItemTransitionRepository } from './work-item-transition.repository.js';

class StubTransitionRepository extends WorkItemTransitionRepository {
  committed?: WorkItemStatus;
  prerequisiteStatuses: readonly WorkItemStatus[] = [];
  item = WorkItem.create({
    id: 'item-1', projectId: 'project-1', type: 'Feature', title: 'Board', description: 'Board work',
    status: 'Backlog', acceptanceCriteria: ['Cards are visible'],
  });

  get(): Promise<WorkItem> { return Promise.resolve(this.item); }
  getPrerequisiteStatuses(): Promise<readonly WorkItemStatus[]> { return Promise.resolve(this.prerequisiteStatuses); }
  commitStatus(item: WorkItem): Promise<void> {
    this.committed = item.status;
    return Promise.resolve();
  }
}

describe('TransitionWorkItemHandler', () => {
  it('validates and commits a status transition', async () => {
    const repository = new StubTransitionRepository();
    const result = await new TransitionWorkItemHandler(repository)
      .execute(new TransitionWorkItemCommand('item-1', 'Ready', 'user-123'));
    expect(result).toEqual({ id: 'item-1', status: 'Ready' });
    expect(repository.committed).toBe('Ready');
  });

  it('blocks starting work with an unfinished prerequisite', async () => {
    const repository = new StubTransitionRepository();
    repository.item.transitionTo('Ready');
    repository.prerequisiteStatuses = ['Testing'];
    await expect(new TransitionWorkItemHandler(repository)
      .execute(new TransitionWorkItemCommand('item-1', 'InProgress', 'user-123')))
      .rejects.toThrow('Unfinished prerequisites');
  });
});
