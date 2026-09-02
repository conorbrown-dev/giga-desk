import { Link, Route, Routes, useParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { fetchExecutionHistory, type ExecutionHistory } from './execution-api.js';
import { fetchProjects, fetchProjectWorkItems, type ProjectSummary, type ProjectWorkItem } from './project-api.js';
import { StartWorkControls } from './start-work-controls.js';
import { CreateProjectForm } from './create-project-form.js';
import { CreateFeatureForm } from './create-feature-form.js';
import type { AuthenticationState } from './auth-token.js';
import { AgentSetupGuide } from './agent-setup-guide.js';

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
  return <><header className="page-header"><h1>Project Portfolio</h1><p>Track and manage your development projects.</p></header><CreateProjectForm onCreated={() => { setReload((value) => value + 1); }} />{error ? <p role="alert">{error}</p> : projects === null ? <p>Loading projects…</p> : projects.length === 0 ? <p>No projects yet.</p>    : <section aria-label="Projects" className="grid">{projects.map((project) => <article className="card" key={project.id}><div className="card-header"><h2><Link to={`/projects/${project.id}`}>{project.key} · {project.name}</Link></h2><span className={project.status === 'Completed' ? 'completed' : project.status === 'In Progress' ? 'in-progress' : project.status === 'Blocked' ? 'blocked' : 'pending'}>{project.status}</span></div><p>{project.businessGoal}</p><div className="status-row"><div className="status-item"><span className="status-label">Priority</span><span className="status-value">{project.priority}</span></div></div></article>)}</section>}</>;
}

function ProjectWorkItems() {
  const { projectId = '' } = useParams();
  const [reload, setReload] = useState(0);
  const load = useCallback((signal: AbortSignal) => fetchProjectWorkItems(projectId, signal), [projectId]);
  const { data: workItems, error } = useAuthenticatedLoad<ProjectWorkItem>(load, reload);
  const totalCriteria = workItems?.reduce((sum, item) => sum + item.criteria.length, 0) ?? 0;
  const completedCriteria = workItems?.reduce((sum, item) => sum + item.criteria.filter((c) => c.satisfied).length, 0) ?? 0;
  return <><header className="page-header"><Link to="/projects" className="back-link">← Back to Projects</Link><h1>Project Work Items</h1><p>Manage features and track acceptance criteria progress.</p></header><CreateFeatureForm projectId={projectId} onCreated={() => { setReload((value) => value + 1); }} />{error ? <p role="alert">{error}</p> : workItems === null ? <p>Loading work items…</p> : workItems.length === 0 ? <p>No work items yet.</p>         : <><div className="summary-stats"><div className="summary-stat"><span className="summary-stat-label">Total Work Items</span><span className="summary-stat-value">{workItems.length}</span></div><div className="summary-stat"><span className="summary-stat-label">Acceptance Criteria</span><span className="summary-stat-value">{completedCriteria}/{totalCriteria}</span></div><div className="summary-stat"><span className="summary-stat-label">Completion Rate</span><span className="summary-stat-value">{totalCriteria > 0 ? Math.round((completedCriteria / totalCriteria) * 100) : 0}%</span></div></div><section aria-label="Work items" className="grid">{workItems.map((item) => <article className="card" key={item.id}><div className="card-header"><h2><Link to={`/work-items/${item.id}`}>{item.title}</Link></h2><span className={item.status === 'Completed' ? 'completed' : item.status === 'In Progress' ? 'in-progress' : item.status === 'Blocked' ? 'blocked' : 'pending'}>{item.status}</span></div><p>{item.type} · {item.priority} priority · {item.criteria.filter((criterion) => criterion.satisfied).length} of {item.criteria.length} criteria complete</p><div className="status-row"><div className="status-item"><span className="status-label">Status</span><span className="status-value">{item.status}</span></div><div className="status-item"><span className="status-label">Priority</span><span className="status-value">{item.priority}</span></div><div className="status-item"><span className="status-label">Progress</span><span className="status-value">{item.criteria.filter((c) => c.satisfied).length}/{item.criteria.length}</span></div></div></article>)}</section></>}</>;
}

function ExecutionDashboard() {
  const { workItemId = '' } = useParams();
  const [history, setHistory] = useState<readonly ExecutionHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => { const request = new AbortController(); fetchExecutionHistory(workItemId, request.signal).then((value) => { setHistory(value); }).catch((reason: unknown) => { if (!request.signal.aborted) setError(reason instanceof Error ? reason.message : 'Execution history is unavailable.'); }); return () => { request.abort(); }; }, [workItemId, reload]);
  const completedExecutions = history.filter((e) => e.status === 'Completed').length;
  const failedExecutions = history.filter((e) => e.status === 'Failed').length;
  return <><header className="page-header"><Link to="/projects" className="back-link">← Back to Projects</Link><h1>Work Item Execution</h1><p>Track execution attempts, test results, and deployment history.</p></header><StartWorkControls workItemId={workItemId} onQueued={() => { setReload((value) => value + 1); }} />{error ? <p role="alert">{error}</p> : history.length === 0 ? <p>No execution attempts yet.</p>    : <><div className="summary-stats"><div className="summary-stat"><span className="summary-stat-label">Total Attempts</span><span className="summary-stat-value">{history.length}</span></div><div className="summary-stat"><span className="summary-stat-label">Success Rate</span><span className="summary-stat-value">{history.length > 0 ? Math.round((completedExecutions / history.length) * 100) : 0}%</span></div><div className="summary-stat"><span className="summary-stat-label">Failures</span><span className="summary-stat-value">{failedExecutions}</span></div></div><section aria-label="Execution attempts" className="grid">{history.map((execution) => <article className="card" key={execution.id}><div className="card-header"><h2>{execution.status}</h2><span>{execution.agent.name} · {execution.node.name}</span></div><div className="status-row"><div className="status-item"><span className="status-label">Model</span><span className="status-value">{execution.model.displayName} ({execution.model.provider})</span></div><div className="status-item"><span className="status-label">Started</span><span className="status-value">{execution.startedAt ? new Date(execution.startedAt).toLocaleString() : 'Pending'}</span></div></div>{execution.failureReason && <div role="alert" className=" failure-notice" style={{ background: '#1f2937', borderLeft: '4px solid #fca5a5', padding: '1rem', borderRadius: '0 .5rem .5rem 0', marginTop: '1rem' }}>{execution.failureReason}</div>}<h3 style={{ color: '#f7fafc', fontSize: '.875rem', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: '1.5rem', marginBottom: '.75rem' }}>Evidence</h3><ul className="evidence-list">{execution.tests.map((test) => <li key={`${test.type}-${test.createdAt}`}><span className="evidence-type">{test.type}</span><span className={test.result === 'Passed' ? 'evidence-passed' : 'evidence-failed'}> · {test.result}</span></li>)}</ul><h3 style={{ color: '#f7fafc', fontSize: '.875rem', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: '1.5rem', marginBottom: '.75rem' }}>Deployments</h3>{execution.deployments.length > 0 ? execution.deployments.map((deployment) => <div key={`${deployment.environment}-${deployment.startedAt}`} className="deployment-row"><span className="deployment-env">{deployment.environment}</span><span className={`deployment-status ${deployment.status === 'Success' ? 'success' : deployment.status === 'Failed' ? 'failed' : 'pending'}`}>{deployment.status}</span></div>) : <p style={{ color: '#718096', fontSize: '.875rem', fontStyle: 'italic' }}>No deployments yet</p>}</article>)}</section></>}</>;
}

const testAuthentication: AuthenticationState = {
  configured: true, authenticated: true, username: null, error: null,
  login: async () => {}, logout: async () => {},
};

export function App({ authentication = testAuthentication }: { authentication?: AuthenticationState }) {
  if (authentication.error) return <main><h1>Giga Desk</h1><p role="alert">{authentication.error}</p></main>;
  if (!authentication.configured) return <main><h1>Giga Desk</h1><p role="alert">Keycloak is not configured.</p></main>;
  if (!authentication.authenticated) return <main><p className="eyebrow">Praxis Project Orchestrator</p><h1>Turn plans into shipped work.</h1><p>Sign in to manage projects and features.</p><button className="button" type="button" onClick={() => { void authentication.login(); }}>Sign in</button></main>;
  return (
    <><header className="site-header"><nav className="site-nav" aria-label="Primary navigation"><div className="nav-links"><Link className="brand-link" to="/projects">Giga Desk</Link><Link to="/agents/connect">Connect agent</Link></div><div className="account-menu"><span className="account-name">{authentication.username ?? 'Signed in'}</span><button className="button button-secondary" type="button" onClick={() => { void authentication.logout(); }}>Sign out</button></div></nav></header><Routes>
      <Route path="*" element={<main><p>Praxis Project Orchestrator</p><h1>Turn plans into shipped work.</h1><Link className="button-link" to="/projects">View projects</Link></main>} />
      <Route path="/projects" element={<ProjectList />} />
      <Route path="/projects/:projectId" element={<ProjectWorkItems />} />
      <Route path="/work-items/:workItemId" element={<ExecutionDashboard />} />
      <Route path="/agents/connect" element={<AgentSetupGuide />} />
    </Routes></>
  );
}
