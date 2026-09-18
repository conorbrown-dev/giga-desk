import type { WorkPackage } from '@giga-desk/agent-client/agent-api';
import { spawn } from 'node:child_process';
import { parseExecutionResult, promptFor, resultSchema, validateVisualEvidence, type CodexExecutionResult, type CodexProgressUpdate, type ExecutionProcessControl } from './codex-executor.js';

interface RpcMessage { id?: number; method?: string; result?: unknown; error?: { message?: string }; params?: Record<string, unknown> }
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export class CodexAppServerExecutor {
  execute(work: WorkPackage, repositoryPath: string, onProgress?: (update: CodexProgressUpdate) => void,
    control?: ExecutionProcessControl): Promise<CodexExecutionResult> {
    return new Promise((resolve, reject) => {
      const child = spawn('codex', ['app-server'], { cwd: repositoryPath, stdio: ['pipe', 'pipe', 'pipe'] });
      if (child.pid) control?.onStarted(child.pid);
      let buffer = ''; let threadId: string | undefined; let resultText: string | undefined; let nextId = 1; let completed = false;
      const send = (method: string, params: object, id?: number): void => { child.stdin.write(`${JSON.stringify({ method, params, ...(id === undefined ? {} : { id }) })}\n`); };
      const fail = (error: Error): void => { if (!completed) { completed = true; child.kill(); reject(error); } };
      const finish = async (): Promise<void> => {
        if (completed) return; completed = true;
        try {
          if (!resultText) throw new Error('Codex App Server returned no structured result');
          const parsed = parseExecutionResult(JSON.parse(resultText));
          await validateVisualEvidence(work, parsed, repositoryPath); resolve(parsed);
        } catch (error) { reject(error instanceof Error ? error : new Error('Codex App Server result validation failed')); } finally { child.kill(); }
      };
      control?.signal.addEventListener('abort', () => {
        if (threadId) send('turn/interrupt', { threadId }, nextId++);
        else fail(new Error('Execution terminated by an authorized user'));
      }, { once: true });
      child.once('error', (error) => { fail(error); });
      child.stderr.on('data', () => undefined);
      child.stdout.on('data', (chunk: Buffer) => {
        buffer += chunk.toString(); const lines = buffer.split('\n'); buffer = lines.pop() ?? '';
        for (const line of lines) {
          let message: RpcMessage; try { message = JSON.parse(line) as RpcMessage; } catch { continue; }
          if (message.error) { fail(new Error(message.error.message ?? 'Codex App Server request failed')); return; }
          if (message.id === 1 && record(message.result) && record(message.result['thread']) && typeof message.result['thread']['id'] === 'string') {
            threadId = message.result['thread']['id'];
            send('turn/start', { threadId, input: [{ type: 'text', text: promptFor(work) }], cwd: repositoryPath,
              approvalPolicy: 'never', sandboxPolicy: { type: 'workspaceWrite', writableRoots: [repositoryPath], networkAccess: true },
              ...(work.execution.model.identifier === 'codex-cli-default' ? {} : { model: work.execution.model.identifier }), outputSchema: resultSchema }, nextId++);
          }
          if (message.method === 'item/completed' && record(message.params) && record(message.params['item'])
            && message.params['item']['type'] === 'agentMessage' && typeof message.params['item']['text'] === 'string') resultText = message.params['item']['text'];
          if (message.method === 'turn/completed') void finish();
        }
      });
      send('initialize', { clientInfo: { name: 'giga-desk-worker', title: 'Giga Desk Worker', version: '1.0.0' } }, 0);
      send('initialized', {});
      send('thread/start', {}, 1);
      onProgress?.({ phase: 'Codex App Server', message: 'Starting the work item session' });
    });
  }
}
