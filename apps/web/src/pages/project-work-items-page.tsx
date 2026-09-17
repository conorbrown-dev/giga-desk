import { Link, useParams } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { CreateFeatureForm } from '../create-feature-form.js';
import { Alert, AlertDescription } from '../components/ui/alert.js';
import { Badge } from '../components/ui/badge.js';
import { Card, CardContent } from '../components/ui/card.js';
import { Skeleton } from '../components/ui/skeleton.js';
import { useAuthenticatedLoad } from '../hooks/use-authenticated-load.js';
import { fetchProjectWorkItems, type ProjectWorkItem } from '../project-api.js';
import { statusClassName } from '../ui/status-class-name.js';

export function ProjectWorkItemsPage() {
  const { projectId = '' } = useParams();
  const [reload, setReload] = useState(0);
  const [featureCreated, setFeatureCreated] = useState(false);
  const load = useCallback((signal: AbortSignal) => fetchProjectWorkItems(projectId, signal), [projectId]);
  const { data: workItems, error } = useAuthenticatedLoad<ProjectWorkItem>(load, reload);
  const totalCriteria = workItems?.reduce((sum, item) => sum + item.criteria.length, 0) ?? 0;
  const completedCriteria = workItems?.reduce((sum, item) => sum + item.criteria.filter((criterion) => criterion.satisfied).length, 0) ?? 0;

  return <><header className="page-header work-items-header"><div><Link to="/projects" className="back-link">← Projects</Link><p className="eyebrow">Project backlog</p><h1>Project Work Items</h1><p>Prioritize features, verify their criteria, and open execution history.</p></div><div className="page-header-actions"><Link className="settings-link" to={`/projects/${projectId}/settings`}>Project settings</Link><CreateFeatureForm projectId={projectId} onCreated={() => { setFeatureCreated(true); setReload((value) => value + 1); }} /></div></header>{featureCreated && <Alert role="status"><AlertDescription>Feature created.</AlertDescription></Alert>}{error ? <Alert variant="destructive" className="state-panel"><AlertDescription>{error}</AlertDescription></Alert> : workItems === null ? <Card className="state-panel" aria-busy="true"><CardContent className="flex flex-col items-center gap-3"><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-32" /></CardContent></Card> : workItems.length === 0 ? <Card className="state-panel"><CardContent>No work items yet. Add the first feature above.</CardContent></Card> : <><div className="summary-stats work-item-summary" aria-label="Work item summary"><div className="summary-stat"><span className="summary-stat-label">Work items</span><span className="summary-stat-value">{workItems.length}</span></div><div className="summary-stat"><span className="summary-stat-label">Criteria complete</span><span className="summary-stat-value accent-cyan">{completedCriteria}/{totalCriteria}</span></div><div className="summary-stat"><span className="summary-stat-label">Completion</span><span className="summary-stat-value accent-green">{totalCriteria > 0 ? Math.round((completedCriteria / totalCriteria) * 100) : 0}%</span></div></div><section aria-label="Work items" className="work-item-list">{workItems.map((item) => { const criteriaComplete = item.criteria.filter((criterion) => criterion.satisfied).length; return <Card className="card work-item-row" key={item.id}><CardContent className="contents"><div className="work-item-identity"><span className="project-key">{item.type}</span><h2><Link to={`/work-items/${item.id}`}>{item.title}</Link></h2></div><Badge className={statusClassName(item.status)}>{item.status}</Badge><div className="work-item-progress"><span className="status-label">Acceptance criteria</span><strong>{criteriaComplete}/{item.criteria.length}</strong></div><div className="work-item-priority"><span className="status-label">Priority</span><span className="status-value">{item.priority}</span></div></CardContent></Card>; })}</section></>}</>;
}
