import { describe, expect, it } from 'vitest';
import { ListProjectsHandler } from './list-projects.handler.js';
import type { ProjectListItem } from './list-projects.query.js';
import { ProjectQueries } from './project-queries.js';

const projects: readonly ProjectListItem[] = [{
  id: 'project-1', key: 'GD', name: 'Giga Desk', businessGoal: 'Ship reliably',
  status: 'Active', priority: 'High', updatedAt: '2026-08-31T00:00:00.000Z',
}];

class StubProjectQueries extends ProjectQueries {
  listActive(): Promise<readonly ProjectListItem[]> {
    return Promise.resolve(projects);
  }
}

describe('ListProjectsHandler', () => {
  it('returns the read-model projection', async () => {
    await expect(new ListProjectsHandler(new StubProjectQueries()).execute()).resolves.toBe(projects);
  });
});
