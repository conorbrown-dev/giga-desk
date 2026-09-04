import { Link, NavLink, Route, Routes, useParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { fetchExecutionHistory, streamExecutionHistory, type ExecutionHistory } from './execution-api.js';
import { ExecutionActivity, isExecutionActive } from './execution-activity.js';
import { ExecutionProcessControl } from './execution-process-control.js';
import { ExecutionActions } from './execution-actions.js';
import { archiveProject, fetchProjects, fetchProjectWorkItems, type ProjectSummary, type ProjectWorkItem } from './project-api.js';
import { StartWorkControls } from './start-work-controls.js';
import { CreateProjectForm } from './create-project-form.js';
import { CreateFeatureForm } from './create-feature-form.js';
import type { AuthenticationState } from './auth-token.js';
import { AgentSetupGuide } from './agent-setup-guide.js';

const statusClassName = (status: string): string => {
  if (status === 'Completed' || status === 'Success' || status === 'Active') return 'status-chip status-positive';
  if (status === 'Blocked' || status === 'Failed') return 'status-chip status-negative';
  if (status === 'In Progress' || status === 'Running' || status === 'Online') return 'status-chip status-running';
  return 'status-chip status-pending';
};

function useAuthenticatedLoad<T>(load: (signal: AbortSignal) => Promise<readonly T[]>, reloadKey = 0) {
  const [data, setData] = useState<readonly T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const request = new AbortController();
    load(request.signal).then((value) => { setData(value); }).catch((reason: unknown) => {
      if (!request.signal.aborted) setError(reason instanceof Error ? reason.message : 'Data is unavailable.');
    });
    return () => { request.abort(); };
  }, [load, reloadKey]);
  return { data, error };
}

function ProjectList() {
  const [reload, setReload] = useState(0);
  const { data: projects, error } = useAuthenticatedLoad<ProjectSummary>(fetchProjects, reload);
  return <><header className="page-header control-center-header"><div><p className="eyebrow">Workspace overview</p><h1>Project Portfolio</h1><p>Track delivery health, priorities, and active development work.</p></div><div className="page-header-actions"><span className="environment-chip"><i aria-hidden="true" />Production workspace</span><CreateProjectForm onCreated={() => { setReload((value) => value + 1); }} /></div></header>{error ? <p className="state-panel" role="alert">{error}</p> : projects === null ? <p className="state-panel">Loading projects…</p> : projects.length === 0 ? <p className="state-panel">No projects yet. Add your first project above.</p> : <><div className="summary-stats" aria-label="Portfolio summary"><div className="summary-stat"><span className="summary-stat-label">Total projects</span><span className="summary-stat-value">{projects.length}</span></div><div className="summary-stat"><span className="summary-stat-label">Active</span><span className="summary-stat-value accent-green">{projects.filter((project) => project.status === 'Active').length}</span></div><div className="summary-stat"><span className="summary-stat-label">High priority</span><span className="summary-stat-value accent-amber">{projects.filter((project) => project.priority === 'High').length}</span></div></div><section aria-label="Projects" className="grid project-grid">{projects.map((project) => <article className="card project-row" key={project.id}><div className="card-header"><div><span className="project-key">{project.key}</span><h2><Link to={`/projects/${project.id}`}>{project.key} · {project.name}</Link></h2></div><span className={statusClassName(project.status)}>{project.status}</span></div><p>{project.businessGoal}</p><div className="status-row"><div className="status-item"><span className="status-label">Priority</span><span className="status-value">{project.priority}</span></div><div className="status-item"><span className="status-label">Updated</span><span className="status-value">{new Date(project.updatedAt).toLocaleDateString()}</span></div></div></article>)}</section></>}</>;
}

function ProjectWorkItems() {
  const { projectId = '' } = useParams();
  const [reload, setReload] = useState(0);
  const load = useCallback((signal: AbortSignal) => fetchProjectWorkItems(projectId, signal), [projectId]);
  const { data: workItems, error } = useAuthenticatedLoad<ProjectWorkItem>(load, reload);
  const totalCriteria = workItems?.reduce((sum, item) => sum + item.criteria.length, 0) ?? 0;
  const completedCriteria = workItems?.reduce((sum, item) => sum + item.criteria.filter((c) => c.satisfied).length, 0) ?? 0;
  return <><header className="page-header work-items-header"><div><Link to="/projects" className="back-link">← Projects</Link><p className="eyebrow">Project backlog</p><h1>Project Work Items</h1><p>Prioritize features, verify their criteria, and open execution history.</p></div><div className="page-header-actions"><Link className="settings-link" to={`/projects/${projectId}/settings`}>Project settings</Link><CreateFeatureForm projectId={projectId} onCreated={() => { setReload((value) => value + 1); }} /></div></header>{error ? <p className="state-panel" role="alert">{error}</p> : workItems === null ? <p className="state-panel">Loading work items…</p> : workItems.length === 0 ? <p className="state-panel">No work items yet. Add the first feature above.</p> : <><div className="summary-stats work-item-summary" aria-label="Work item summary"><div className="summary-stat"><span className="summary-stat-label">Work items</span><span className="summary-stat-value">{workItems.length}</span></div><div className="summary-stat"><span className="summary-stat-label">Criteria complete</span><span className="summary-stat-value accent-cyan">{completedCriteria}/{totalCriteria}</span></div><div className="summary-stat"><span className="summary-stat-label">Completion</span><span className="summary-stat-value accent-green">{totalCriteria > 0 ? Math.round((completedCriteria / totalCriteria) * 100) : 0}%</span></div></div><section aria-label="Work items" className="work-item-list">{workItems.map((item) => { const criteriaComplete = item.criteria.filter((criterion) => criterion.satisfied).length; return <article className="card work-item-row" key={item.id}><div className="work-item-identity"><span className="project-key">{item.type}</span><h2><Link to={`/work-items/${item.id}`}>{item.title}</Link></h2></div><span className={statusClassName(item.status)}>{item.status}</span><div className="work-item-progress"><span className="status-label">Acceptance criteria</span><strong>{criteriaComplete}/{item.criteria.length}</strong></div><div className="work-item-priority"><span className="status-label">Priority</span><span className="status-value">{item.priority}</span></div></article>; })}</section></>}</>;
}

function ExecutionDashboard() {
  const { workItemId = '' } = useParams();
  const [history, setHistory] = useState<readonly ExecutionHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [targetReload, setTargetReload] = useState(0);
  useEffect(() => { const request = new AbortController(); fetchExecutionHistory(workItemId, request.signal).then((value) => { setHistory(value); }).catch((reason: unknown) => { if (!request.signal.aborted) setError(reason instanceof Error ? reason.message : 'Execution history is unavailable.'); }); return () => { request.abort(); }; }, [workItemId, reload]);
  const hasActiveExecution = history.some((execution) => isExecutionActive(execution.status));
  useEffect(() => {
    if (!hasActiveExecution) return;
    const request = new AbortController();
    streamExecutionHistory(workItemId, request.signal, setHistory).catch((reason: unknown) => {
      if (!request.signal.aborted) setLiveError(reason instanceof Error ? reason.message : 'Live execution updates are unavailable.');
    });
    return () => { request.abort(); };
  }, [hasActiveExecution, workItemId]);
  const completedExecutions = history.filter((e) => e.status === 'Completed').length;
  const failedExecutions = history.filter((e) => e.status === 'Failed').length;
  return <><header className="page-header"><div><Link to="/projects" className="back-link">← Projects</Link><h1>Work Item Execution</h1><p>Track execution attempts, test results, and deployment history.</p></div></header><StartWorkControls key={targetReload} workItemId={workItemId} onQueued={() => { setReload((value) => value + 1); }} />{error ? <p className="state-panel" role="alert">{error}</p> : history.length === 0 ? <p className="state-panel">No execution attempts yet.</p> : <>{liveError && <p className="live-update-warning" role="status">{liveError} Reload to refresh.</p>}<div className="summary-stats"><div className="summary-stat"><span className="summary-stat-label">Total Attempts</span><span className="summary-stat-value">{history.length}</span></div><div className="summary-stat"><span className="summary-stat-label">Success Rate</span><span className="summary-stat-value accent-green">{history.length > 0 ? Math.round((completedExecutions / history.length) * 100) : 0}%</span></div><div className="summary-stat"><span className="summary-stat-label">Failures</span><span className="summary-stat-value accent-red">{failedExecutions}</span></div></div><section aria-label="Execution attempts" className="grid execution-grid">{history.map((execution) => <article className="card execution-card" key={execution.id}><div className="card-header"><h2>{execution.agent.name} · {execution.node.name}</h2><span className={statusClassName(execution.status)}>{execution.status}</span></div><div className="status-row"><div className="status-item"><span className="status-label">Model</span><span className="status-value">{execution.model.displayName} ({execution.model.provider})</span></div><div className="status-item"><span className="status-label">Started at</span><span className="status-value">{execution.startedAt ? new Date(execution.startedAt).toLocaleString() : 'Not started'}</span></div></div>{execution.failureReason && <div role="alert" className="failure-notice">{execution.failureReason}</div>}<ExecutionProcessControl execution={execution} workItemId={workItemId} onChanged={() => { setReload((value) => value + 1); }} /><ExecutionActivity execution={execution} />{execution.tests.length > 0 && <section className="execution-detail"><h3 className="section-label">Evidence</h3><ul className="evidence-list">{execution.tests.map((test) => <li key={`${test.type}-${test.createdAt}`}><span className="evidence-type">{test.type}</span><span className={test.result === 'Passed' ? 'evidence-passed' : 'evidence-failed'}> · {test.result}</span></li>)}</ul></section>}{execution.deployments.length > 0 && <section className="execution-detail"><h3 className="section-label">Deployments</h3>{execution.deployments.map((deployment) => <div key={`${deployment.environment}-${deployment.startedAt}`} className="deployment-row"><span className="deployment-env">{deployment.environment}</span><span className={statusClassName(deployment.status)}>{deployment.status}</span></div>)}</section>}<ExecutionActions executionId={execution.id} status={execution.status} workItemId={workItemId} onChanged={() => { setReload((value) => value + 1); setTargetReload((value) => value + 1); }} /></article>)}</section></>}</>;}

function ProjectSettings() {
  const { projectId = '' } = useParams(); const [confirmation, setConfirmation] = useState(''); const [message, setMessage] = useState('');
  const { data: projects } = useAuthenticatedLoad<ProjectSummary>(fetchProjects); const project = projects?.find((candidate) => candidate.id === projectId);
  if (!project) return <p className="state-panel">Loading project settings…</p>;
  return <><header className="page-header"><div><Link to={`/projects/${projectId}`} className="back-link">← Project work items</Link><p className="eyebrow">Project settings</p><h1>{project.name}</h1><p>Manage this project’s lifecycle.</p></div></header><section className="card"><p className="eyebrow">Danger zone</p><h2>Archive project</h2><p>Archiving keeps the project and its history, but removes it from active project lists.</p><label>Type <strong>{project.name}</strong> to confirm archive<input value={confirmation} onChange={(event) => { setConfirmation(event.target.value); }} /></label><button type="button" disabled={confirmation !== project.name} onClick={() => { void archiveProject(projectId, project.name).then(() => { window.location.assign('/projects'); }).catch((reason: unknown) => { setMessage(reason instanceof Error ? reason.message : 'Unable to archive this project.'); }); }}>Confirm archive</button>{message && <p role="alert">{message}</p>}</section></>;
}

const testAuthentication: AuthenticationState = {
  configured: true, authenticated: true, username: null, error: null,
  login: async () => {}, logout: async () => {},
};

export function App({ authentication = testAuthentication }: { authentication?: AuthenticationState }) {
  if (authentication.error) return <main className="auth-page"><h1>Giga Desk</h1><p role="alert">{authentication.error}</p></main>;
  if (!authentication.configured) return <main className="auth-page"><h1>Giga Desk</h1><p role="alert">Keycloak is not configured.</p></main>;
  if (!authentication.authenticated) return <main className="auth-page"><div className="auth-card"><img className="auth-banner" src="/images/giga-desk-banner-logo.png" alt="Giga Desk" /><p className="eyebrow">Praxis Project Orchestrator</p><h1>Turn plans into shipped work.</h1><p>One command center for projects, agents, and delivery evidence.</p><button className="button" type="button" onClick={() => { void authentication.login(); }}>Sign in</button></div></main>;
  return (
    <div className="app-shell"><header className="site-header"><nav className="site-nav" aria-label="Primary navigation"><Link className="brand-link" to="/projects"><img className="brand-mark" src="/images/giga-desk-icon.png" alt="" /><span>Giga Desk<small aria-hidden="true">Control center</small></span></Link><div className="nav-links"><NavLink end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} to="/projects">Projects</NavLink><NavLink className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} to="/agents/connect">Connect agent</NavLink></div><div className="account-menu"><span className="account-avatar" aria-hidden="true">{(authentication.username ?? 'G').slice(0, 1).toUpperCase()}</span><span className="account-name">{authentication.username ?? 'Signed in'}</span><button className="button button-secondary" type="button" onClick={() => { void authentication.logout(); }}>Sign out</button></div></nav></header><main className="workspace"><Routes>
      <Route path="*" element={<><p>Praxis Project Orchestrator</p><h1>Turn plans into shipped work.</h1><Link className="button-link" to="/projects">View projects</Link></>} />
      <Route path="/projects" element={<ProjectList />} />
      <Route path="/projects/:projectId" element={<ProjectWorkItems />} />
      <Route path="/projects/:projectId/settings" element={<ProjectSettings />} />
      <Route path="/work-items/:workItemId" element={<ExecutionDashboard />} />
      <Route path="/agents/connect" element={<AgentSetupGuide />} />
    </Routes></main></div>
  );
}
