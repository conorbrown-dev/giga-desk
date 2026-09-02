import { describe, expect, it } from 'vitest';
import { AgentWorkPackageQueries } from './agent-work-package-queries.js';
import { GetWorkPackageHandler } from './get-work-package.handler.js';
import { GetWorkPackageQuery, type WorkPackage } from './get-work-package.query.js';

const workPackage: WorkPackage = {
  executionJobId: 'job-1',
  authorization: { protectedActionsApproved: false },
  project: { id: 'project-1', key: 'GD', name: 'Giga Desk', description: '', businessGoal: 'Ship',
    repositoryUrl: null, defaultBranch: null },
  workItem: { id: 'item-1', type: 'Feature', title: 'Board', description: '', technicalNotes: null,
    implementationInstructions: null, parent: null, visualReferences: [], acceptanceCriteria: [], dependencies: [] },
  execution: { node: { id: 'node-1', name: 'Node' }, agent: { id: 'agent-1', name: 'Agent', type: 'Simulator', version: '1' },
    model: { id: 'model-1', displayName: 'Model', provider: 'Local', identifier: 'model' } },
  expectations: { tests: ['Unit'], deploymentRequired: false, visualReviewRequired: false },
};
class StubWorkPackages extends AgentWorkPackageQueries {
  get(): Promise<WorkPackage> { return Promise.resolve(workPackage); }
}

describe('GetWorkPackageHandler', () => {
  it('returns the machine execution contract', async () => {
    const handler = new GetWorkPackageHandler(new StubWorkPackages());
    await expect(handler.execute(new GetWorkPackageQuery('job-1', 'node-1'))).resolves.toBe(workPackage);
  });
});
