import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CreateFeatureForm, CreateWorkItemForm } from '../create-feature-form.js';
import { Alert, AlertDescription } from '../components/ui/alert.js';
import { Badge } from '../components/ui/badge.js';
import { buttonVariants } from '../components/ui/button.js';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card.js';
import { Skeleton } from '../components/ui/skeleton.js';
import { useAuthenticatedLoad } from '../hooks/use-authenticated-load.js';
import { fetchProjectWorkItems, type ProjectWorkItem } from '../project-api.js';
import { statusClassName } from '../ui/status-class-name.js';

export function ProjectWorkItemsPage() {
  const { projectId = '' } = useParams();
  const [reload, setReload] = useState(0);
  const [createdMessage, setCreatedMessage] = useState<string>();
  const load = useCallback((signal: AbortSignal) => fetchProjectWorkItems(projectId, signal), [projectId]);
  const { data: workItems, error } = useAuthenticatedLoad<ProjectWorkItem>(load, reload);
  const features = workItems?.filter((item) => item.type === 'Feature') ?? [];
  const childWorkItems = workItems?.filter((item) => item.type !== 'Feature') ?? [];
  const totalCriteria = childWorkItems.reduce((sum, item) => sum + item.criteria.length, 0);
  const completedCriteria = childWorkItems.reduce(
    (sum, item) => sum + item.criteria.filter((criterion) => criterion.satisfied).length,
    0,
  );
  const refresh = (message: string) => { setCreatedMessage(message); setReload((value) => value + 1); };

  return <>
    <header className="page-header work-items-header">
      <div>
        <Link to="/projects" className="back-link">← Projects</Link>
        <p className="eyebrow">01 — Project backlog</p>
        <h1>Project Delivery Plan</h1>
        <p>Plan outcomes as features, then assign their individual work items to delivery agents.</p>
      </div>
      <div className="page-header-actions">
        <Link className={buttonVariants({ variant: 'outline' })} to={`/projects/${projectId}/settings`}>Project settings</Link>
        <CreateFeatureForm projectId={projectId} onCreated={() => { refresh('Feature created.'); }} />
      </div>
    </header>
    {createdMessage && <Alert role="status"><AlertDescription>{createdMessage}</AlertDescription></Alert>}
    {error ? <Alert variant="destructive" className="state-panel"><AlertDescription>{error}</AlertDescription></Alert>
      : workItems === null ? <Card className="state-panel" aria-busy="true"><CardContent className="flex flex-col items-center gap-3"><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-32" /></CardContent></Card>
        : workItems.length === 0 ? <Card className="state-panel"><CardContent>No work items yet. Add the first feature above.</CardContent></Card>
          : <>
            <section className="dashboard-section" aria-labelledby="backlog-health">
              <div className="section-heading"><p className="section-kicker">02 — Backlog health</p><h2 id="backlog-health">Work at a glance</h2></div>
              <div className="summary-stats work-item-summary" aria-label="Work item summary">
                <Card className="summary-stat"><CardContent className="contents"><span className="summary-stat-label">Features</span><span className="summary-stat-value">{features.length}</span></CardContent></Card>
                <Card className="summary-stat"><CardContent className="contents"><span className="summary-stat-label">Work items</span><span className="summary-stat-value accent-cyan">{childWorkItems.length}</span></CardContent></Card>
                <Card className="summary-stat"><CardContent className="contents"><span className="summary-stat-label">Criteria complete</span><span className="summary-stat-value accent-cyan">{completedCriteria}/{totalCriteria}</span></CardContent></Card>
              </div>
            </section>
            <section aria-labelledby="work-items-heading" className="dashboard-section work-items-section">
              <div className="section-heading"><div><p className="section-kicker">03 — Delivery plan</p><h2 id="work-items-heading">Features and work items</h2></div><p>Features organize the outcome. Work items are the assignable units.</p></div>
              <div className="feature-list">
                {features.map((feature) => {
                  const children = childWorkItems.filter((item) => item.parentId === feature.id);
                  return <Card className="feature-group" key={feature.id}><CardHeader><div><Badge variant="outline" className="project-key">Feature</Badge><CardTitle>{feature.title}</CardTitle><CardDescription>{children.length} {children.length === 1 ? 'work item' : 'work items'}</CardDescription></div><CardAction><Badge className={statusClassName(feature.status)}>{feature.status}</Badge></CardAction></CardHeader><CardContent>{children.length === 0 ? <p className="feature-empty">No work items yet. Break this feature into an assignable piece of work.</p> : <div className="feature-work-item-list">{children.map((item) => <WorkItemRow item={item} key={item.id} />)}</div>}</CardContent><CardFooter><CreateWorkItemForm projectId={projectId} featureId={feature.id} onCreated={() => { refresh('Work item created.'); }} /></CardFooter></Card>;
                })}
                {childWorkItems.some((item) => !features.some((feature) => feature.id === item.parentId)) && <Card className="feature-group"><CardHeader><div><Badge variant="outline" className="project-key">Needs organization</Badge><CardTitle>Unassigned work items</CardTitle><CardDescription>Move these items under a feature to complete the delivery hierarchy.</CardDescription></div></CardHeader><CardContent><div className="feature-work-item-list">{childWorkItems.filter((item) => !features.some((feature) => feature.id === item.parentId)).map((item) => <WorkItemRow item={item} key={item.id} />)}</div></CardContent></Card>}
              </div>
            </section>
          </>}
  </>;
}

function WorkItemRow({ item }: { item: ProjectWorkItem }) {
  const criteriaComplete = item.criteria.filter((criterion) => criterion.satisfied).length;
  return <article className="feature-work-item"><div className="work-item-identity"><Badge variant="secondary">Work item · User story</Badge><h3><Link to={`/work-items/${item.id}`}>{item.title}</Link></h3></div><Badge className={statusClassName(item.status)}>{item.status}</Badge><div className="work-item-progress"><span className="status-label">Criteria</span><strong>{criteriaComplete}/{item.criteria.length}</strong></div><div className="work-item-priority"><span className="status-label">Priority</span><span className="status-value">{item.priority}</span></div></article>;
}
