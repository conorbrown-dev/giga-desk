import type { WorkPackage } from '@giga-desk/agent-client/agent-api';
import { describe, expect, it, vi } from 'vitest';
import { OpenCodeExecutor, type OpenCodeCommandRunner } from './opencode-executor.js';

const work: WorkPackage = {
  executionJobId: 'job-1', authorization: { protectedActionsApproved: false },
  project: { id: 'project-1', key: 'PR', name: 'Project', description: '', businessGoal: 'Ship', repositoryUrl: 'https://github.com/example/project.git', defaultBranch: 'main' },
  workItem: { id: 'work-1', type: 'Task', title: 'Run', description: 'Do it', technicalNotes: null, implementationInstructions: null, parent: null, visualReferences: [], dependencies: [], acceptanceCriteria: [{ id: 'criterion-1', text: 'Done', satisfied: false }] },
  execution: { node: { id: 'node-1', name: 'MIRIAM' }, agent: { id: 'agent-1', name: 'MIRIAM', type: 'OpenCode', version: '1.18.26' }, model: { id: 'model-1', displayName: 'Qwen', provider: 'Ollama', identifier: 'ollama/qwen3-coder-next:q4_K_M' } },
  expectations: { tests: ['Unit'], deploymentRequired: false, visualReviewRequired: false },
};

const result = { summary: 'Done', tests: [{ type: 'Unit', result: 'Passed', testCount: 1, failedTests: [], durationMs: 1 }], visualEvidence: [], deployment: { environment: 'Development', status: 'Succeeded', version: null, commitHash: null, url: null }, satisfiedAcceptanceCriterionIds: ['criterion-1'], branchName: null, commitHash: null, pullRequestUrl: null };

describe('OpenCodeExecutor', () => {
  it('runs the assigned model and parses the final JSON event', async () => {
    const started = vi.fn();
    const run = vi.fn<OpenCodeCommandRunner>((_args, options) => {
      options.onStarted?.(5_432);
      expect(options.signal).toBeInstanceOf(AbortSignal);
      return Promise.resolve(JSON.stringify({ type: 'step_start' }) + '\n' + JSON.stringify({ type: 'text', part: { type: 'text', text: JSON.stringify(result) } }));
    });
    const repositoryPath = process.cwd();
    await expect(new OpenCodeExecutor(run).execute(work, repositoryPath, undefined,
      { signal: new AbortController().signal, onStarted: started })).resolves.toEqual(result);
    expect(run).toHaveBeenCalledWith(expect.arrayContaining(['run', '--format', 'json', '--auto', '--dir', repositoryPath, '--model', 'ollama/qwen3-coder-next:q4_K_M']), expect.anything());
    expect(started).toHaveBeenCalledWith(5_432);
  });
});
