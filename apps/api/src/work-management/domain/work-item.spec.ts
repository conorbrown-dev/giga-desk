import { describe, expect, it } from 'vitest';
import { WorkItem, type WorkItemProps } from './work-item.js';

const feature = (overrides: Partial<WorkItemProps> = {}) => WorkItem.create({
  id: 'feature-1', projectId: 'project-1', type: 'Feature', title: 'Ship board', description: 'Board work', status: 'Ready',
  acceptanceCriteria: ['Feature appears on the board'], ...overrides,
});

describe('WorkItem', () => {
  it('supports hierarchy and a valid workflow transition', () => {
    const item = feature({ parentId: 'epic-1' });
    item.transitionTo('InProgress');
    expect(item.status).toBe('InProgress');
    expect(item.props.parentId).toBe('epic-1');
  });

  it('rejects invalid transitions and feature definitions', () => {
    expect(() => feature({ acceptanceCriteria: [] })).toThrow('Features require acceptance criteria');
    expect(() => feature({ acceptanceCriteria: [' '] })).toThrow('Acceptance criteria cannot be blank');
    expect(() => { feature().transitionTo('Completed'); }).toThrow('Cannot transition');
  });

  it('blocks work while a prerequisite is unfinished', () => {
    expect(() => { feature().assertCanStart(['Completed', 'Testing']); }).toThrow('Unfinished prerequisites');
  });
});
