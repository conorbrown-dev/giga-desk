import { ErrorMessage, Field, Form, Formik } from 'formik';
import { Link, useParams } from 'react-router-dom';
import * as Yup from 'yup';
import { useAuthenticatedLoad } from '../hooks/use-authenticated-load.js';
import { archiveProject, fetchProjects } from '../project-api.js';

export function ProjectSettingsPage() {
  const { projectId = '' } = useParams();
  const { data: projects, error } = useAuthenticatedLoad(fetchProjects);
  const project = projects?.find((candidate) => candidate.id === projectId);
  if (error) return <p className="state-panel" role="alert">{error}</p>;
  if (projects === null) return <p className="state-panel">Loading project settings…</p>;
  if (!project) return <p className="state-panel" role="alert">This project is unavailable.</p>;

  const schema = Yup.object({ projectName: Yup.string().oneOf([project.name], 'Enter the project name exactly.').required('Enter the project name to continue.') });
  return <><header className="page-header"><div><Link to={`/projects/${projectId}`} className="back-link">← Project work items</Link><p className="eyebrow">Project settings</p><h1>{project.name}</h1><p>Manage this project’s lifecycle.</p></div></header><section className="danger-panel" aria-labelledby="archive-project-heading"><div><p className="section-kicker">Danger zone</p><h2 id="archive-project-heading">Archive project</h2><p>Archiving keeps the project and its history, but removes it from active project lists.</p></div><Formik initialValues={{ projectName: '' }} validationSchema={schema} onSubmit={async (values, { setStatus }) => {
    setStatus(undefined);
    try { await archiveProject(projectId, values.projectName); window.location.assign('/projects'); }
    catch (reason: unknown) { setStatus(reason instanceof Error ? reason.message : 'Unable to archive this project.'); }
  }}>{({ isSubmitting, status, values }) => <Form className="archive-form"><label htmlFor="archive-project-name"><span>Type <strong>{project.name}</strong> to confirm archive</span><Field id="archive-project-name" name="projectName" autoComplete="off" /></label><ErrorMessage name="projectName" component="span" /><div><button className="button-danger" type="submit" disabled={isSubmitting || values.projectName !== project.name}>{isSubmitting ? 'Archiving…' : 'Confirm archive'}</button>{status && <p role="alert">{status}</p>}</div></Form>}</Formik></section></>;
}
