import { ErrorMessage, Field as FormikField, Form, Formik } from 'formik';
import { Link, useNavigate, useParams } from 'react-router-dom';
import * as Yup from 'yup';
import { Alert, AlertDescription } from '../components/ui/alert.js';
import { Badge } from '../components/ui/badge.js';
import { Button } from '../components/ui/button.js';
import { Card, CardContent } from '../components/ui/card.js';
import { Field, FieldDescription, FieldError, FieldLabel } from '../components/ui/field.js';
import { Input } from '../components/ui/input.js';
import { Skeleton } from '../components/ui/skeleton.js';
import { useAuthenticatedLoad } from '../hooks/use-authenticated-load.js';
import { archiveProject, fetchProjects } from '../project-api.js';

export function ProjectSettingsPage() {
  const { projectId = '' } = useParams();
  const navigate = useNavigate();
  const { data: projects, error } = useAuthenticatedLoad(fetchProjects);
  const project = projects?.find((candidate) => candidate.id === projectId);
  if (error) return <Alert variant="destructive" className="state-panel"><AlertDescription>{error}</AlertDescription></Alert>;
  if (projects === null) return <Card className="state-panel" aria-busy="true"><CardContent className="flex flex-col items-center gap-3"><Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-32" /></CardContent></Card>;
  if (!project) return <Alert variant="destructive" className="state-panel"><AlertDescription>This project is unavailable.</AlertDescription></Alert>;

  const schema = Yup.object({ projectName: Yup.string().oneOf([project.name], 'Enter the project name exactly.').required('Enter the project name to continue.') });
  return <><header className="page-header project-settings-header"><div><Link to={`/projects/${projectId}`} className="back-link">← Project work items</Link><p className="eyebrow">Project settings</p><h1>{project.name}</h1><p>Manage this project’s lifecycle and access.</p></div><Badge variant="outline" className="settings-context">Project lifecycle</Badge></header><section className="settings-section" aria-labelledby="archive-project-heading"><div className="section-heading"><div><p className="section-kicker">01 — Retire project</p><h2 id="archive-project-heading">Archive this project</h2></div></div><Card className="archive-panel"><CardContent className="contents"><div className="archive-copy"><span className="archive-marker" aria-hidden="true">!</span><div><h3>Remove from active delivery work</h3><p>Archiving preserves the project and its history, but removes it from active project lists. This action cannot be undone from this screen.</p></div></div><Formik initialValues={{ projectName: '' }} validationSchema={schema} onSubmit={async (values, { setStatus }) => {
    setStatus(undefined);
    try { await archiveProject(projectId, values.projectName); void navigate('/projects'); }
    catch (reason: unknown) { setStatus(reason instanceof Error ? reason.message : 'Unable to archive this project.'); }
  }}>{({ errors, isSubmitting, status, touched, values }) => <Form className="archive-form"><Field className="archive-field" data-invalid={Boolean(errors.projectName && touched.projectName)}><FieldLabel htmlFor="archive-project-name">Confirmation name</FieldLabel><FieldDescription id="archive-name-instruction" className="archive-instruction">Type <strong>{project.name}</strong> exactly to enable archiving.</FieldDescription><FormikField as={Input} id="archive-project-name" name="projectName" autoComplete="off" aria-describedby="archive-name-instruction archive-name-help" aria-invalid={Boolean(errors.projectName && touched.projectName)} /><FieldDescription id="archive-name-help">Names are case-sensitive.</FieldDescription><ErrorMessage name="projectName" render={(message) => <FieldError>{message}</FieldError>} /></Field><div className="archive-actions"><Button variant="destructive" type="submit" disabled={isSubmitting || values.projectName !== project.name}>{isSubmitting ? 'Archiving…' : 'Archive project'}</Button>{status && <Alert variant="destructive"><AlertDescription>{String(status)}</AlertDescription></Alert>}</div></Form>}</Formik></CardContent></Card></section></>;
}
