import { Link, NavLink, Route, Routes } from 'react-router-dom';
import { AgentSetupGuide } from './agent-setup-guide.js';
import type { AuthenticationState } from './auth-token.js';
import { AccountMenu } from './components/account-menu.js';
import { ExecutionDashboardPage } from './pages/execution-dashboard-page.js';
import { ProjectListPage } from './pages/project-list-page.js';
import { ProjectCreatePage } from './pages/project-create-page.js';
import { ProjectSettingsPage } from './pages/project-settings-page.js';
import { ProjectWorkItemsPage } from './pages/project-work-items-page.js';

const testAuthentication: AuthenticationState = {
  configured: true, authenticated: true, username: null, error: null,
  login: async () => {}, logout: async () => {},
};

function AuthenticatedShell({ authentication }: { authentication: AuthenticationState }) {
  return <div className="app-shell"><aside className="site-sidebar"><nav className="site-nav" aria-label="Primary navigation"><Link className="brand-link" to="/projects"><img className="brand-mark" src="/images/giga-desk-icon.png" alt="" /><span>Giga Desk<small aria-hidden="true">Control center</small></span></Link><div className="sidebar-group"><span>Workspace</span><NavLink end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} to="/projects">Projects</NavLink></div><div className="sidebar-group"><span>Operations</span><NavLink className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} to="/agents/connect">Connect agent</NavLink></div></nav><p className="sidebar-footer">Giga Desk · Ops</p></aside><div className="app-content"><header className="site-header"><div className="utility-context"><span className="utility-marker" aria-hidden="true" />Control center</div><nav className="top-nav" aria-label="Account controls"><AccountMenu username={authentication.username} onSignOut={() => { void authentication.logout(); }} /></nav></header><main className="workspace"><Routes>
    <Route path="*" element={<><p>Praxis Project Orchestrator</p><h1>Turn plans into shipped work.</h1><Link className="button-link" to="/projects">View projects</Link></>} />
    <Route path="/projects" element={<ProjectListPage />} />
    <Route path="/projects/new" element={<ProjectCreatePage />} />
    <Route path="/projects/:projectId" element={<ProjectWorkItemsPage />} />
    <Route path="/projects/:projectId/settings" element={<ProjectSettingsPage />} />
    <Route path="/work-items/:workItemId" element={<ExecutionDashboardPage />} />
    <Route path="/agents/connect" element={<AgentSetupGuide />} />
  </Routes></main></div></div>;
}

export function App({ authentication = testAuthentication }: { authentication?: AuthenticationState }) {
  if (authentication.error) return <main className="auth-page"><h1>Giga Desk</h1><p role="alert">{authentication.error}</p></main>;
  if (!authentication.configured) return <main className="auth-page"><h1>Giga Desk</h1><p role="alert">Auth0 is not configured.</p></main>;
  if (!authentication.authenticated) return <main className="auth-page"><div className="auth-card"><img className="auth-banner" src="/images/giga-desk-banner-logo.png" alt="Giga Desk" /><p className="eyebrow">Praxis Project Orchestrator</p><h1>Turn plans into shipped work.</h1><p>One command center for projects, agents, and delivery evidence.</p><button className="button" type="button" onClick={() => { void authentication.login(); }}>Sign in</button></div></main>;
  return <AuthenticatedShell authentication={authentication} />;
}
