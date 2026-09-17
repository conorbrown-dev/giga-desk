import { useState } from 'react';
import { Alert, AlertDescription } from './components/ui/alert.js';
import { Button } from './components/ui/button.js';
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

  return <div className="execution-action-area">{error && <Alert variant="destructive" className="execution-action-error"><AlertDescription>{error}</AlertDescription></Alert>}<div className="execution-actions" role="group" aria-label="Execution actions">{canClear && <Button type="button" variant="destructive" disabled={pendingAction !== null} onClick={() => { void run('clear'); }}>{pendingAction === 'clear' ? 'Clearing…' : 'Clear execution'}</Button>}{canRetry && <Button type="button" variant="outline" disabled={pendingAction !== null} onClick={() => { void run('retry'); }}>{pendingAction === 'retry' ? 'Retrying…' : 'Retry execution'}</Button>}</div></div>;
}
