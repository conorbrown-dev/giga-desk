import { describe, expect, it } from 'vitest';
import type { ExecutionSelection } from '../domain/execution-selection.js';
import { CreateExecutionJobCommand, type QueuedExecutionJob } from './create-execution-job.command.js';
import { CreateExecutionJobHandler } from './create-execution-job.handler.js';
import { ExecutionJobRepository } from './execution-job-repository.js';

const selection: ExecutionSelection = {
  projectId: 'project-1', workItemStatus: 'Backlog', prerequisiteStatuses: [], hasActiveJob: false,
  node: { enabled: true, status: 'Online', currentJobCount: 0, maximumConcurrentJobs: 1,
    supportedAgentTypes: ['Simulator'], supportedModelProviders: ['Local'] },
  agent: { enabled: true, agentType: 'Simulator', supportedModelProviders: ['Local'] },
  model: { enabled: true, provider: 'Local' },
};

class RecordingExecutionJobRepository extends ExecutionJobRepository {
  created?: QueuedExecutionJob;
  loadSelection(): Promise<ExecutionSelection> { return Promise.resolve(selection); }
  create(job: QueuedExecutionJob): Promise<void> { this.created = job; return Promise.resolve(); }
}

describe('CreateExecutionJobHandler', () => {
  it('validates and queues the selected node, agent, and model', async () => {
    const repository = new RecordingExecutionJobRepository();
    const result = await new CreateExecutionJobHandler(repository).execute(new CreateExecutionJobCommand(
      'work-item-1', 'node-1', 'agent-1', 'model-1', 'user-123',
    ));
    expect(result).toMatchObject({ workItemId: 'work-item-1', executionNodeId: 'node-1', status: 'Queued' });
    expect(repository.created).toEqual(result);
  });

  it('rejects incompatible selections before persistence', async () => {
    const repository = new RecordingExecutionJobRepository();
    selection.node.supportedModelProviders = [];
    await expect(new CreateExecutionJobHandler(repository).execute(new CreateExecutionJobCommand(
      'work-item-1', 'node-1', 'agent-1', 'model-1', 'user-123',
    ))).rejects.toThrow('incompatible');
    selection.node.supportedModelProviders = ['Local'];
  });
});
