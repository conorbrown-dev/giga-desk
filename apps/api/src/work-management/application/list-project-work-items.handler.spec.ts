import { describe, expect, it } from 'vitest';
import { ListProjectWorkItemsHandler } from './list-project-work-items.handler.js';
import { ListProjectWorkItemsQuery, type ProjectWorkItemView } from './list-project-work-items.query.js';
import { WorkItemQueries } from './work-item-queries.js';

const workItems: readonly ProjectWorkItemView[] = [{
  id: 'feature-1', parentId: null, type: 'Feature', title: 'Project board', status: 'Backlog', priority: 'Medium',
  criteria: [{ id: 'criterion-1', text: 'Cards are visible', satisfied: false, sortOrder: 0 }],
}];

class StubWorkItemQueries extends WorkItemQueries {
  listForProject(): Promise<readonly ProjectWorkItemView[]> {
    return Promise.resolve(workItems);
  }
}

describe('ListProjectWorkItemsHandler', () => {
  it('returns the Project work-item read model', async () => {
    const handler = new ListProjectWorkItemsHandler(new StubWorkItemQueries());
    await expect(handler.execute(new ListProjectWorkItemsQuery('project-1'))).resolves.toBe(workItems);
  });
});
