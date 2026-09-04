import { useState } from 'react';
import { terminateExecution, type ExecutionHistory } from './execution-api.js';

interface Props { execution: ExecutionHistory; workItemId: string; onChanged: () => void }

export function ExecutionProcessControl({ execution, workItemId, onChanged }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const process = execution.process;
  if (!process) return null;
  const requested = process.terminationRequestedAt !== null;
  const running = execution.status === 'Running';
  const terminate = async () => {
    setPending(true); setError(null);
    try { await terminateExecution(workItemId, execution.id); setConfirming(false); onChanged(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to terminate the execution process.'); }
    finally { setPending(false); }
  };
  return <section className="process-control" aria-label="Worker process"><div className="process-identity"><span>Worker process</span><strong>{execution.agent.name} <code>PID {process.id}</code></strong><small>Started {new Date(process.startedAt).toLocaleString()}</small></div><span className={`process-state ${running && !requested ? 'process-running' : ''}`}>{requested ? 'Stopping' : running ? 'Running' : 'Exited'}</span>{running && !requested && (confirming ? <div className="process-confirm" role="group" aria-label="Confirm process termination"><span>Stop this process?</span><button type="button" onClick={() => { setConfirming(false); }}>Cancel</button><button className="process-stop" type="button" disabled={pending} onClick={() => { void terminate(); }}>{pending ? 'Stopping…' : 'Stop'}</button></div> : <button className="process-stop" type="button" onClick={() => { setConfirming(true); }}>Stop process</button>)}{error && <p role="alert">{error}</p>}</section>;
}
