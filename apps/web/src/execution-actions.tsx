import { useState } from 'react';
import { clearExecution, retryExecution } from './execution-api.js';

interface ExecutionActionsProps {
  executionId: string;
  status: string;
  workItemId: string;
  onChanged: () => void;
}

export function ExecutionActions({ executionId, status, workItemId, onChanged }: ExecutionActionsProps) {
  const [pendingAction, setPendingAction] = useState<'clear' | 'retry' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canClear = ['Queued', 'Failed', 'Cancelled'].includes(status);
  const canRetry = ['Failed', 'Cancelled'].includes(status);
  if (!canClear && !canRetry) return null;

  const run = async (action: 'clear' | 'retry') => {
    setError(null);
    setPendingAction(action);
    try {
      if (action === 'clear') await clearExecution(workItemId, executionId);
      else await retryExecution(workItemId, executionId);
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Unable to ${action} the execution.`);
    } finally {
      setPendingAction(null);
    }
  };

  return <div className="execution-action-area">{error && <p className="execution-action-error" role="alert">{error}</p>}<div className="execution-actions" role="group" aria-label="Execution actions">{canClear && <button type="button" className="execution-action execution-action-clear" disabled={pendingAction !== null} onClick={() => { void run('clear'); }}>{pendingAction === 'clear' ? 'Clearing…' : 'Clear execution'}</button>}{canRetry && <button type="button" className="execution-action execution-action-retry" disabled={pendingAction !== null} onClick={() => { void run('retry'); }}>{pendingAction === 'retry' ? 'Retrying…' : 'Retry execution'}</button>}</div></div>;
}
