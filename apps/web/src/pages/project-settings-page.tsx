import { ErrorMessage, Field, Form, Formik } from 'formik';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as Yup from 'yup';
import { useAuthenticatedLoad } from '../hooks/use-authenticated-load.js';
import { archiveProject, fetchProjects } from '../project-api.js';

export function ProjectSettingsPage() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const { data: projects, error } = useAuthenticatedLoad(fetchProjects);
  const project = projects?.find((candidate) => candidate.id === projectId);
  if (error) return <p className="state-panel" role="alert">{error}</p>;
  if (projects === null) return <p className="state-panel">Loading project settings…</p>;
  if (!project) return <p className="state-panel" role="alert">This project is unavailable.</p>;

  const schema = Yup.object({ projectName: Yup.string().oneOf([project.name], 'Enter the project name exactly.').required('Enter the project name to continue.') });
  return <><header className="page-header project-settings-header"><div><Link to={`/projects/${projectId}`} className="back-link">← Project work items</Link><p className="eyebrow">Project settings</p><h1>{project.name}</h1><p>Manage this project’s lifecycle and access.</p></div><span className="settings-context">Project lifecycle</span></header><section className="settings-section" aria-labelledby="archive-project-heading"><div className="section-heading"><div><p className="section-kicker">01 — Retire project</p><h2 id="archive-project-heading">Archive this project</h2></div></div><div className="archive-panel"><div className="archive-copy"><span className="archive-marker" aria-hidden="true">!</span><div><h3>Remove from active delivery work</h3><p>Archiving preserves the project and its history, but removes it from active project lists. This action cannot be undone from this screen.</p></div></div><Formik initialValues={{ projectName: '' }} validationSchema={schema} onSubmit={async (values, { setStatus }) => {
    setStatus(undefined);
    try { await archiveProject(projectId, values.projectName); void navigate('/projects'); }
    catch (reason: unknown) { setStatus(reason instanceof Error ? reason.message : 'Unable to archive this project.'); }
  }}>{({ isSubmitting, status, values }) => <Form className="archive-form"><div className="archive-field"><label htmlFor="archive-project-name">Confirmation name</label><span id="archive-name-instruction" className="archive-instruction">Type <strong>{project.name}</strong> exactly to enable archiving.</span><Field id="archive-project-name" name="projectName" autoComplete="off" aria-describedby="archive-name-instruction archive-name-help" /><small id="archive-name-help">Names are case-sensitive.</small></div><ErrorMessage name="projectName" component="span" /><div className="archive-actions"><button className="button-danger" type="submit" disabled={isSubmitting || values.projectName !== project.name}>{isSubmitting ? 'Archiving…' : 'Archive project'}</button>{status && <p role="alert">{status}</p>}</div></Form>}</Formik></div></section></>;
}
