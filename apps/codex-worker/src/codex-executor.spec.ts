import type { WorkPackage } from '@giga-desk/agent-client/agent-api';
import { writeFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { CodexExecutor, type CommandRunner } from './codex-executor.js';

const workPackage: WorkPackage = {
  executionJobId: 'job-1',
  project: { id: 'project-1', key: 'GD', name: 'Giga Desk', description: 'Plan work', businessGoal: 'Ship safely',
    repositoryUrl: 'https://github.com/conorbrown-dev/giga-desk.git', defaultBranch: 'main' },
  workItem: { id: 'work-1', type: 'Feature', title: 'Run Codex', description: 'Execute real work',
    technicalNotes: null, implementationInstructions: null, parent: null,
    acceptanceCriteria: [{ id: 'criterion-1', text: 'Verified', satisfied: false }], dependencies: [] },
  execution: { node: { id: 'node-1', name: 'MIRIAM' },
    agent: { id: 'agent-1', name: 'Codex CLI', type: 'Codex', version: '0.152.0' },
    model: { id: 'model-1', displayName: 'Codex CLI default', provider: 'OpenAI', identifier: 'codex-cli-default' } },
  expectations: { tests: ['Unit', 'Integration', 'EndToEnd'], deploymentRequired: true },
};

const successfulResult = {
  summary: 'Implemented and verified.',
  tests: [
    { type: 'Unit', result: 'Passed', testCount: 4, failedTests: [], durationMs: 100 },
    { type: 'Integration', result: 'Passed', testCount: 2, failedTests: [], durationMs: 200 },
    { type: 'EndToEnd', result: 'Passed', testCount: 1, failedTests: [], durationMs: 300 },
  ],
  deployment: { environment: 'Production', status: 'Succeeded', version: 'abc123', commitHash: 'abc123', url: 'https://app.test' },
  satisfiedAcceptanceCriterionIds: ['criterion-1'], branchName: 'main', commitHash: 'abc123', pullRequestUrl: null,
};

describe('CodexExecutor', () => {
  it('runs Codex without a shell and accepts strict completion evidence', async () => {
    const run = vi.fn<CommandRunner>(async (file, args) => {
      expect(file).toBe('codex');
      expect(args).toContain('workspace-write');
      expect(args).not.toContain('--model');
      const outputIndex = args.indexOf('--output-last-message');
      const outputPath = args[outputIndex + 1];
      if (!outputPath) throw new Error('Missing output path');
      await writeFile(outputPath, JSON.stringify(successfulResult));
    });

    const result = await new CodexExecutor(run).execute(workPackage, '/trusted/repository');

    expect(result.summary).toBe('Implemented and verified.');
    expect(result.satisfiedAcceptanceCriterionIds).toEqual(['criterion-1']);
    expect(run).toHaveBeenCalledOnce();
  });

  it('rejects incomplete evidence instead of treating it as success', async () => {
    const run: CommandRunner = async (_file, args) => {
      const outputPath = args[args.indexOf('--output-last-message') + 1];
      if (!outputPath) throw new Error('Missing output path');
      await writeFile(outputPath, JSON.stringify({ ...successfulResult, tests: [{ type: 'Unit', result: 'Failed' }] }));
    };

    await expect(new CodexExecutor(run).execute(workPackage, '/trusted/repository'))
      .rejects.toThrow('invalid test evidence');
  });
});
