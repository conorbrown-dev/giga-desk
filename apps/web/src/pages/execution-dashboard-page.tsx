import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '../components/ui/alert.js';
import { Badge } from '../components/ui/badge.js';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.js';
import { ExecutionActions } from '../execution-actions.js';
import { ExecutionActivity, isExecutionActive } from '../execution-activity.js';
import { fetchExecutionHistory, streamExecutionHistory, type ExecutionHistory } from '../execution-api.js';
import { ExecutionProcessControl } from '../execution-process-control.js';
import { StartWorkControls } from '../start-work-controls.js';
import { statusClassName } from '../ui/status-class-name.js';

export function ExecutionDashboardPage() {
  const { workItemId = '' } = useParams();
  const [history, setHistory] = useState<readonly ExecutionHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [targetReload, setTargetReload] = useState(0);

  useEffect(() => { const request = new AbortController(); fetchExecutionHistory(workItemId, request.signal).then(setHistory).catch((reason: unknown) => { if (!request.signal.aborted) setError(reason instanceof Error ? reason.message : 'Execution history is unavailable.'); }); return () => { request.abort(); }; }, [workItemId, reload]);
  const hasActiveExecution = history.some((execution) => isExecutionActive(execution.status));
  useEffect(() => {
    if (!hasActiveExecution) return;
    const request = new AbortController();
    streamExecutionHistory(workItemId, request.signal, setHistory).catch((reason: unknown) => {
      if (!request.signal.aborted) setLiveError(reason instanceof Error ? reason.message : 'Live execution updates are unavailable.');
    });
    return () => { request.abort(); };
  }, [hasActiveExecution, workItemId]);

  const completedExecutions = history.filter((execution) => execution.status === 'Completed').length;
  const failedExecutions = history.filter((execution) => execution.status === 'Failed').length;
  return <><header className="page-header"><div><Link to="/projects" className="back-link">← Projects</Link><p className="eyebrow">Execution control</p><h1>Work Item Execution</h1><p>Track execution attempts, test results, and deployment history.</p></div></header><StartWorkControls key={targetReload} workItemId={workItemId} onQueued={() => { setReload((value) => value + 1); }} />{error ? <Alert variant="destructive" className="state-panel"><AlertDescription>{error}</AlertDescription></Alert> : history.length === 0 ? <Card className="state-panel"><CardContent>No execution attempts yet.</CardContent></Card> : <>{liveError && <Alert className="live-update-warning" role="status"><AlertDescription>{liveError} Reload to refresh.</AlertDescription></Alert>}<div className="summary-stats execution-summary" aria-label="Execution summary"><Card className="summary-stat"><CardContent className="contents"><span className="summary-stat-label">Total Attempts</span><span className="summary-stat-value">{history.length}</span></CardContent></Card><Card className="summary-stat"><CardContent className="contents"><span className="summary-stat-label">Success Rate</span><span className="summary-stat-value accent-green">{Math.round((completedExecutions / history.length) * 100)}%</span></CardContent></Card><Card className="summary-stat"><CardContent className="contents"><span className="summary-stat-label">Failures</span><span className="summary-stat-value accent-red">{failedExecutions}</span></CardContent></Card></div><section aria-label="Execution attempts" className="grid execution-grid">{history.map((execution) => <Card className="card execution-card" key={execution.id}><CardHeader className="card-header"><CardTitle><h2>{execution.agent.name} · {execution.node.name}</h2></CardTitle><Badge className={statusClassName(execution.status)}>{execution.status}</Badge></CardHeader><CardContent className="contents"><div className="status-row"><div className="status-item"><span className="status-label">Model</span><span className="status-value">{execution.model.displayName} ({execution.model.provider})</span></div><div className="status-item"><span className="status-label">Started at</span><span className="status-value">{execution.startedAt ? new Date(execution.startedAt).toLocaleString() : 'Not started'}</span></div></div>{execution.failureReason && <Alert variant="destructive" className="failure-notice"><AlertDescription>{execution.failureReason}</AlertDescription></Alert>}<ExecutionProcessControl execution={execution} workItemId={workItemId} onChanged={() => { setReload((value) => value + 1); }} /><ExecutionActivity execution={execution} />{execution.tests.length > 0 && <section className="execution-detail"><h3 className="section-label">Evidence</h3><ul className="evidence-list">{execution.tests.map((test) => <li key={`${test.type}-${test.createdAt}`}><span className="evidence-type">{test.type}</span><span className={test.result === 'Passed' ? 'evidence-passed' : 'evidence-failed'}> · {test.result}</span></li>)}</ul></section>}{execution.deployments.length > 0 && <section className="execution-detail"><h3 className="section-label">Deployments</h3>{execution.deployments.map((deployment) => <div key={`${deployment.environment}-${deployment.startedAt}`} className="deployment-row"><span className="deployment-env">{deployment.environment}</span><Badge className={statusClassName(deployment.status)}>{deployment.status}</Badge></div>)}</section>}<ExecutionActions executionId={execution.id} status={execution.status} workItemId={workItemId} onChanged={() => { setReload((value) => value + 1); setTargetReload((value) => value + 1); }} /></CardContent></Card>)}</section></>}</>;
}
