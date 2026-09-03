import type { WorkPackage } from '@giga-desk/agent-client/agent-api';
import { execFile } from 'node:child_process';
import { parseExecutionResult, promptFor, validateVisualEvidence, type CodexExecutionResult } from './codex-executor.js';

interface RunOptions { cwd: string; timeout: number; maxBuffer: number }
export type OpenCodeCommandRunner = (args: readonly string[], options: RunOptions) => Promise<string>;

const runCommand: OpenCodeCommandRunner = (args, options) => new Promise((resolve, reject) => {
  execFile('opencode', args, options, (error, stdout) => {
    if (error) reject(new Error(`OpenCode process failed with code ${String(error.code ?? 'unknown')}`, { cause: error }));
    else resolve(stdout);
  });
});

const textEvents = (output: string): string[] => output.split('\n').flatMap((line) => {
  try {
    const event: unknown = JSON.parse(line);
    if (typeof event !== 'object' || event === null || !('type' in event) || event.type !== 'text'
      || !('part' in event) || typeof event.part !== 'object' || event.part === null || !('text' in event.part)
      || typeof event.part.text !== 'string') return [];
    return [event.part.text];
  } catch { return []; }
});

const parseOpenCodeResult = (output: string): CodexExecutionResult => {
  const text = textEvents(output).at(-1);
  if (!text) throw new Error('OpenCode returned no completed text event');
  try { return parseExecutionResult(JSON.parse(text)); } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('OpenCode returned no structured execution result');
    return parseExecutionResult(JSON.parse(text.slice(start, end + 1)));
  }
};

export class OpenCodeExecutor {
  constructor(private readonly run: OpenCodeCommandRunner = runCommand,
    private readonly timeoutMs = 7_200_000) {}

  async execute(work: WorkPackage, repositoryPath: string): Promise<CodexExecutionResult> {
    const output = await this.run(['run', '--format', 'json', '--auto', '--dir', repositoryPath, '--model', work.execution.model.identifier, promptFor(work)],
      { cwd: repositoryPath, timeout: this.timeoutMs, maxBuffer: 1_000_000 });
    const result = parseOpenCodeResult(output);
    await validateVisualEvidence(work, result, repositoryPath);
    return result;
  }
}
