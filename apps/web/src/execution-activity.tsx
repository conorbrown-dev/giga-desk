import type { ExecutionHistory } from './execution-api.js';

const terminalStatuses = new Set(['Completed', 'Failed', 'Cancelled']);

export const isExecutionActive = (status: string): boolean => !terminalStatuses.has(status);

export function ExecutionActivity({ execution }: { execution: ExecutionHistory }) {
  const active = isExecutionActive(execution.status);
  const progress = execution.progress.slice(-12);
  return <section className="execution-activity" aria-label="Execution activity">
    <div className="activity-heading"><h3 className="section-label">Activity</h3>{active && <span className="live-indicator"><i aria-hidden="true" />Live</span>}</div>
    {progress.length > 0 ? <ol className="activity-list" aria-live="polite">{progress.map((event, index) =>
      <li key={`${event.createdAt}-${String(index)}`}><i aria-hidden="true" /><div><span className="activity-meta"><strong>{event.phase}</strong><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time></span><p>{event.message}</p></div></li>)}</ol>
      : <p className="muted-copy" aria-live="polite">{active ? 'Waiting for the worker’s first update…' : 'No progress events were recorded.'}</p>}
  </section>;
}
