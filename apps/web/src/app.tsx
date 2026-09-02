import { Link, Route, Routes, useParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { fetchExecutionHistory, type ExecutionHistory } from './execution-api.js';
import { fetchProjects, fetchProjectWorkItems, type ProjectSummary, type ProjectWorkItem } from './project-api.js';
import { StartWorkControls } from './start-work-controls.js';
import { CreateProjectForm } from './create-project-form.js';
import { CreateFeatureForm } from './create-feature-form.js';
import type { AuthenticationState } from './auth-token.js';

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
  return <main><p className="eyebrow">Portfolio</p><h1>Projects</h1><CreateProjectForm onCreated={() => { setReload((value) => value + 1); }} />{error ? <p role="alert">{error}</p> : projects === null ? <p>Loading projects…</p> : projects.length === 0 ? <p>No projects yet.</p> : <section aria-label="Projects">{projects.map((project) => <article className="card" key={project.id}><div className="row"><h2><Link to={`/projects/${project.id}`}>{project.key} · {project.name}</Link></h2><span>{project.status}</span></div><p>{project.businessGoal}</p><small>{project.priority} priority</small></article>)}</section>}</main>;
}

function ProjectWorkItems() {
  const { projectId = '' } = useParams();
  const [reload, setReload] = useState(0);
  const load = useCallback((signal: AbortSignal) => fetchProjectWorkItems(projectId, signal), [projectId]);
  const { data: workItems, error } = useAuthenticatedLoad<ProjectWorkItem>(load, reload);
  return <main><Link to="/projects">← Projects</Link><p className="eyebrow">Project work</p><h1>Work items</h1><CreateFeatureForm projectId={projectId} onCreated={() => { setReload((value) => value + 1); }} />{error ? <p role="alert">{error}</p> : workItems === null ? <p>Loading work items…</p> : workItems.length === 0 ? <p>No work items yet.</p> : <section aria-label="Work items">{workItems.map((item) => <article className="card" key={item.id}><div className="row"><h2><Link to={`/work-items/${item.id}`}>{item.title}</Link></h2><span>{item.status}</span></div><p>{item.type} · {item.priority} priority</p><p>{item.criteria.filter((criterion) => criterion.satisfied).length} of {item.criteria.length} acceptance criteria complete</p></article>)}</section>}</main>;
}

function ExecutionDashboard() {
  const { workItemId = '' } = useParams();
  const [history, setHistory] = useState<readonly ExecutionHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => { const request = new AbortController(); fetchExecutionHistory(workItemId, request.signal).then((value) => { setHistory(value); }).catch((reason: unknown) => { if (!request.signal.aborted) setError(reason instanceof Error ? reason.message : 'Execution history is unavailable.'); }); return () => { request.abort(); }; }, [workItemId, reload]);
  return <main><Link to="/projects">← Projects</Link><p className="eyebrow">Execution dashboard</p><h1>Work item activity</h1><StartWorkControls workItemId={workItemId} onQueued={() => { setReload((value) => value + 1); }} />{error ? <p role="alert">{error}</p> : history.length === 0 ? <p>No execution attempts yet.</p> : <section aria-label="Execution attempts">{history.map((execution) => <article className="card" key={execution.id}><div className="row"><h2>{execution.status}</h2><span>{execution.agent.name} · {execution.node.name}</span></div><p>{execution.model.displayName} ({execution.model.provider})</p>{execution.failureReason && <p role="alert">{execution.failureReason}</p>}<h3>Evidence</h3><ul>{execution.tests.map((test) => <li key={`${test.type}-${test.createdAt}`}>{test.type}: {test.result}</li>)}</ul>{execution.deployments.map((deployment) => <p key={`${deployment.environment}-${deployment.startedAt}`}>Deployment: {deployment.environment} · {deployment.status}</p>)}</article>)}</section>}</main>;
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
    <><header className="site-header"><nav className="site-nav" aria-label="Primary navigation"><Link className="brand-link" to="/projects">Giga Desk</Link><div className="account-menu"><span className="account-name">{authentication.username ?? 'Signed in'}</span><button className="button button-secondary" type="button" onClick={() => { void authentication.logout(); }}>Sign out</button></div></nav></header><Routes>
      <Route path="*" element={<main><p>Praxis Project Orchestrator</p><h1>Turn plans into shipped work.</h1><Link className="button-link" to="/projects">View projects</Link></main>} />
      <Route path="/projects" element={<ProjectList />} />
      <Route path="/projects/:projectId" element={<ProjectWorkItems />} />
      <Route path="/work-items/:workItemId" element={<ExecutionDashboard />} />
    </Routes></>
  );
}
