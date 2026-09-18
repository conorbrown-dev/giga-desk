import { Codex } from '@openai/codex-sdk';
import type { WorkPackage } from '@giga-desk/agent-client/agent-api';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseExecutionResult, promptFor, resultSchema, validateVisualEvidence, type CodexExecutionResult, type CodexProgressUpdate, type ExecutionProcessControl } from './codex-executor.js';

export class CodexSdkExecutor {
  async execute(work: WorkPackage, repositoryPath: string, onProgress?: (update: CodexProgressUpdate) => void,
    control?: ExecutionProcessControl): Promise<CodexExecutionResult> {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'giga-desk-codex-sdk-'));
    try {
      const images = await Promise.all(work.workItem.visualReferences.map(async (reference, index) => {
        const path = join(temporaryDirectory, `reference-${String(index)}.img`);
        await writeFile(path, Buffer.from(reference.dataBase64, 'base64'), { mode: 0o600 });
        return { type: 'local_image' as const, path };
      }));
      const thread = new Codex().startThread({ workingDirectory: repositoryPath, sandboxMode: 'workspace-write',
        approvalPolicy: 'never', ...(work.execution.model.identifier === 'codex-cli-default' ? {} : { model: work.execution.model.identifier }) });
      onProgress?.({ phase: 'Codex SDK', message: 'Analyzing the work item' });
      const result = await thread.run([{ type: 'text', text: promptFor(work) }, ...images], { outputSchema: resultSchema,
        ...(control ? { signal: control.signal } : {}) });
      const parsed = parseExecutionResult(JSON.parse(result.finalResponse));
      await validateVisualEvidence(work, parsed, repositoryPath);
      return parsed;
    } finally { await rm(temporaryDirectory, { recursive: true, force: true }); }
  }
}
