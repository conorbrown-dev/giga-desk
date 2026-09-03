import { ErrorMessage, Field, Form, Formik } from 'formik';
import * as Yup from 'yup';
import { createProject, type CreateProjectInput } from './project-api.js';

const initialValues: CreateProjectInput = { key: '', name: '', description: '', businessGoal: '', repositoryUrl: '', defaultBranch: 'main' };
const schema = Yup.object({
  key: Yup.string().matches(/^[A-Za-z][A-Za-z0-9]{1,11}$/, 'Use 2–12 letters or numbers, starting with a letter.').required('Enter a project key.'),
  name: Yup.string().trim().max(120).required('Enter a project name.'),
  description: Yup.string().max(10_000),
  businessGoal: Yup.string().trim().max(10_000).required('Describe the business goal.'),
  repositoryUrl: Yup.string().url('Enter a complete repository URL.').required('Enter the project repository URL.'),
  defaultBranch: Yup.string().trim().max(255).required('Enter the default branch.'),
});

export function CreateProjectForm({ onCreated }: { onCreated: () => void }) {
  return <section className="card" aria-labelledby="create-project-heading"><h2 id="create-project-heading">Add project</h2><Formik<CreateProjectInput> initialValues={initialValues} validationSchema={schema} onSubmit={async (values, { resetForm, setStatus }) => {
    setStatus(undefined);
    try { await createProject(values); resetForm(); setStatus({ success: 'Project created.' }); onCreated(); }
    catch (reason: unknown) { setStatus({ error: reason instanceof Error ? reason.message : 'Unable to create the project.' }); }
  }}>{({ isSubmitting, status }: { isSubmitting: boolean; status?: { success?: string; error?: string } }) => <Form className="form-grid"><label>Project key<Field name="key" placeholder="GD" /><ErrorMessage name="key" component="span" /></label><label>Name<Field name="name" /><ErrorMessage name="name" component="span" /></label><label>Description<Field as="textarea" name="description" rows="3" /><ErrorMessage name="description" component="span" /></label><label>Business goal<Field as="textarea" name="businessGoal" rows="3" /><ErrorMessage name="businessGoal" component="span" /></label><label>Repository URL<Field name="repositoryUrl" placeholder="https://github.com/org/project" /><ErrorMessage name="repositoryUrl" component="span" /></label><label>Default branch<Field name="defaultBranch" placeholder="main" /><ErrorMessage name="defaultBranch" component="span" /></label><p className="form-help">This is the project repository. Giga Desk does not need access to it; a connected worker uses its own approved local checkout.</p><button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Adding…' : 'Add project'}</button>{status?.error && <p role="alert">{status.error}</p>}{status?.success && <p role="status">{status.success}</p>}</Form>}</Formik></section>;
}
