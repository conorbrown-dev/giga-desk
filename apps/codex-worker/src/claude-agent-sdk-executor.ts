import { query, type SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import type { WorkPackage } from '@giga-desk/agent-client/agent-api';
import { parseExecutionResult, promptFor, resultSchema, validateVisualEvidence, type CodexExecutionResult, type CodexProgressUpdate, type ExecutionProcessControl } from './codex-executor.js';

export class ClaudeAgentSdkExecutor {
  async execute(work: WorkPackage, repositoryPath: string, onProgress?: (update: CodexProgressUpdate) => void,
    control?: ExecutionProcessControl): Promise<CodexExecutionResult> {
    if (!process.env['ANTHROPIC_API_KEY']) throw new Error('ANTHROPIC_API_KEY is required for the Claude Agent SDK worker');
    onProgress?.({ phase: 'Claude Agent SDK', message: 'Analyzing the work item' });
    const abortController = new AbortController();
    control?.signal.addEventListener('abort', () => { abortController.abort(); }, { once: true });
    const stream = query({ prompt: promptFor(work), options: { cwd: repositoryPath,
      model: work.execution.model.identifier, abortController,
      permissionMode: 'bypassPermissions', allowDangerouslySkipPermissions: true,
      outputFormat: { type: 'json_schema', schema: resultSchema }, permissionPrompts: 'none' } });
    let outcome: SDKResultMessage | undefined;
    for await (const message of stream) {
      if (message.type === 'assistant') onProgress?.({ phase: 'Claude Agent SDK', message: 'Working in the repository' });
      if (message.type === 'result') outcome = message;
    }
    if (!outcome || outcome.subtype !== 'success' || outcome.is_error) throw new Error('Claude Agent SDK did not complete the work item');
    const parsed = parseExecutionResult(outcome.structured_output ?? JSON.parse(outcome.result));
    await validateVisualEvidence(work, parsed, repositoryPath);
    return parsed;
  }
}
