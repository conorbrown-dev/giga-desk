import type { WorkPackage } from '@giga-desk/agent-client/agent-api';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { codexProgressFromLine, CodexExecutor, type CommandRunner } from './codex-executor.js';

const workPackage: WorkPackage = {
  executionJobId: 'job-1',
  authorization: { protectedActionsApproved: false },
  project: { id: 'project-1', key: 'GD', name: 'Giga Desk', description: 'Plan work', businessGoal: 'Ship safely',
    repositoryUrl: 'https://github.com/conorbrown-dev/giga-desk.git', defaultBranch: 'main' },
  workItem: { id: 'work-1', type: 'Feature', title: 'Run Codex', description: 'Execute real work',
    technicalNotes: null, implementationInstructions: null, parent: null,
    visualReferences: [{ name: 'railway.png', mediaType: 'image/png', dataBase64: 'iVBORw0KGgo=' }],
    acceptanceCriteria: [{ id: 'criterion-1', text: 'Verified', satisfied: false }], dependencies: [] },
  execution: { node: { id: 'node-1', name: 'MIRIAM' },
    agent: { id: 'agent-1', name: 'Codex CLI', type: 'Codex', version: '0.152.0' },
    model: { id: 'model-1', displayName: 'Codex CLI default', provider: 'OpenAI', identifier: 'codex-cli-default' } },
  expectations: { tests: ['Unit', 'Integration', 'EndToEnd'], deploymentRequired: true, visualReviewRequired: true },
};

const successfulResult = {
  summary: 'Implemented and verified.',
  tests: [
    { type: 'Unit', result: 'Passed', testCount: 4, failedTests: [], durationMs: 100 },
    { type: 'Integration', result: 'Passed', testCount: 2, failedTests: [], durationMs: 200 },
    { type: 'EndToEnd', result: 'Passed', testCount: 1, failedTests: [], durationMs: 300 },
  ],
  visualEvidence: [
    { viewport: 'Desktop', screenshotPath: 'desktop.png' },
    { viewport: 'Mobile', screenshotPath: 'mobile.png' },
  ],
  deployment: { environment: 'Production', status: 'Succeeded', version: 'abc123', commitHash: 'abc123', url: 'https://app.test' },
  satisfiedAcceptanceCriterionIds: ['criterion-1'], branchName: 'main', commitHash: 'abc123', pullRequestUrl: null,
};

describe('CodexExecutor', () => {
  it('runs Codex without a shell and accepts strict completion evidence', async () => {
    const repositoryPath = await mkdtemp(join(tmpdir(), 'giga-desk-repository-'));
    await Promise.all(['desktop.png', 'mobile.png'].map((name) => writeFile(join(repositoryPath, name),
      Buffer.from([0x89, 0x50, 0x4e, 0x47]))));
    const run = vi.fn<CommandRunner>(async (file, args, options) => {
      expect(file).toBe('codex');
      expect(args).toContain('--approve-for-me');
      expect(args).not.toContain('--sandbox');
      expect(args).not.toContain('--model');
      expect(args).toContain('--json');
      options.onStarted?.(7_654);
      options.onStdoutLine?.('{"type":"turn.started"}');
      const imagePath = args[args.indexOf('--image') + 1];
      if (!imagePath) throw new Error('Missing visual reference path');
      expect(await readFile(imagePath)).toEqual(Buffer.from('iVBORw0KGgo=', 'base64'));
      expect(args.at(-1)).toContain('"attached": true');
      expect(args.at(-1)).not.toContain('iVBORw0KGgo=');
      const outputIndex = args.indexOf('--output-last-message');
      const outputPath = args[outputIndex + 1];
      if (!outputPath) throw new Error('Missing output path');
      await writeFile(outputPath, JSON.stringify(successfulResult));
    });

    try {
      const progress = vi.fn();
      const started = vi.fn();
      const result = await new CodexExecutor(run).execute(workPackage, repositoryPath, progress,
        { signal: new AbortController().signal, onStarted: started });
      expect(result.summary).toBe('Implemented and verified.');
      expect(result.visualEvidence.map(({ viewport }) => viewport)).toEqual(['Desktop', 'Mobile']);
      expect(run).toHaveBeenCalledOnce();
      expect(progress).toHaveBeenCalledWith({ phase: 'Codex', message: 'Analyzing the work item' });
      expect(started).toHaveBeenCalledWith(7_654);
    } finally { await rm(repositoryPath, { recursive: true, force: true }); }
  });

  it('maps JSONL state changes without exposing commands or structured results', () => {
    expect(codexProgressFromLine('{"type":"item.started","item":{"type":"command_execution","command":"printenv"}}'))
      .toEqual({ phase: 'Repository', message: 'Running a repository command' });
    expect(codexProgressFromLine('{"type":"item.completed","item":{"type":"agent_message","text":"Inspecting the UI"}}'))
      .toEqual({ phase: 'Codex', message: 'Inspecting the UI' });
    expect(codexProgressFromLine('{"type":"item.completed","item":{"type":"agent_message","text":"{\\"summary\\":\\"Done\\"}"}}')).toBeNull();
    expect(codexProgressFromLine('not json')).toBeNull();
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

  it('rejects a required visual review without both screenshots', async () => {
    const run: CommandRunner = async (_file, args) => {
      const outputPath = args[args.indexOf('--output-last-message') + 1];
      if (!outputPath) throw new Error('Missing output path');
      await writeFile(outputPath, JSON.stringify({ ...successfulResult, visualEvidence: [] }));
    };
    await expect(new CodexExecutor(run).execute(workPackage, '/trusted/repository'))
      .rejects.toThrow('exactly one desktop and one mobile screenshot');
  });

  it('rejects visual evidence outside the repository', async () => {
    const repositoryPath = await mkdtemp(join(tmpdir(), 'giga-desk-repository-'));
    const run: CommandRunner = async (_file, args) => {
      const outputPath = args[args.indexOf('--output-last-message') + 1];
      if (!outputPath) throw new Error('Missing output path');
      await writeFile(outputPath, JSON.stringify({ ...successfulResult, visualEvidence: [
        { viewport: 'Desktop', screenshotPath: '/tmp/desktop.png' },
        { viewport: 'Mobile', screenshotPath: 'mobile.png' },
      ] }));
    };
    try {
      await expect(new CodexExecutor(run).execute(workPackage, repositoryPath))
        .rejects.toThrow('repository-relative file');
    } finally { await rm(repositoryPath, { recursive: true, force: true }); }
  });
});
