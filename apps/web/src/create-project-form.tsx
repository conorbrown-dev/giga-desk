import { ErrorMessage, Field as FormikField, Form, Formik } from 'formik';
import * as Yup from 'yup';
import { Alert, AlertDescription } from './components/ui/alert.js';
import { Button } from './components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card.js';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from './components/ui/field.js';
import { Input } from './components/ui/input.js';
import { Textarea } from './components/ui/textarea.js';
import { createProject, type CreateProjectInput } from './project-api.js';

const initialValues: CreateProjectInput = { key: '', name: '', description: '', businessGoal: '', repositoryUrl: '', defaultBranch: 'main' };
const schema = Yup.object({
  key: Yup.string().matches(/^[A-Za-z][A-Za-z0-9]{1,11}$/, 'Use 2–12 letters or numbers, starting with a letter.').required('Enter a project key.'),
  name: Yup.string().trim().max(120).required('Enter a project name.'),
  description: Yup.string().max(10_000),
  businessGoal: Yup.string().trim().max(10_000).required('Describe the business goal.'),
  repositoryUrl: Yup.string().trim().url('Enter a complete repository URL.').matches(/^https?:\/\/(?![^/]*@)[^\s/?#]+\/[^\s/?#][^\s?#]*$/, 'Use an HTTP(S) repository URL without credentials, query parameters, or fragments.').required('Enter the project repository URL.'),
  defaultBranch: Yup.string().trim().max(255).matches(/^(?!@$|[.-])(?![^/]*\.lock(?:\/|$))(?!.*(?:\/\/|\.\.|@\{|\/\.|\/[^/]*\.lock(?:\/|$)))(?!.*(?:\/|\.)$)[^\p{Cc}\s~^:?*[\]\\]+$/u, 'Enter a valid Git branch name.').required('Enter the default branch.'),
});

interface ProjectFormStatus { success?: string; error?: string }
const isProjectFormStatus = (value: unknown): value is ProjectFormStatus => typeof value === 'object' && value !== null;

export function CreateProjectForm({ onCreated }: { onCreated: () => void }) {
  return <Card className="create-project-form" aria-labelledby="create-project-heading"><CardHeader><CardTitle id="create-project-heading">Project details</CardTitle></CardHeader><CardContent><Formik<CreateProjectInput> initialValues={initialValues} validationSchema={schema} onSubmit={async (values, { resetForm, setStatus }) => {
    setStatus(undefined);
    try { await createProject(values); resetForm(); setStatus({ success: 'Project created.' }); onCreated(); }
    catch (reason: unknown) { setStatus({ error: reason instanceof Error ? reason.message : 'Unable to create the project.' }); }
  }}>{(form) => {
    const status: unknown = form.status;
    const feedback = isProjectFormStatus(status) ? status : undefined;
    const field = (name: keyof CreateProjectInput, label: string, input: React.ReactNode) => <Field data-invalid={Boolean(form.errors[name] && form.touched[name])}><FieldLabel htmlFor={`project-${name}`}>{label}</FieldLabel>{input}<ErrorMessage name={name} render={(message) => <FieldError>{message}</FieldError>} /></Field>;
    return <Form><FieldGroup className="form-grid">
      {field('key', 'Project key', <FormikField as={Input} id="project-key" name="key" placeholder="GD" />)}
      {field('name', 'Name', <FormikField as={Input} id="project-name" name="name" />)}
      {field('description', 'Description', <FormikField as={Textarea} id="project-description" name="description" rows="3" />)}
      {field('businessGoal', 'Business goal', <FormikField as={Textarea} id="project-businessGoal" name="businessGoal" rows="3" />)}
      {field('repositoryUrl', 'Repository URL', <FormikField as={Input} id="project-repositoryUrl" name="repositoryUrl" placeholder="https://github.com/org/project" />)}
      {field('defaultBranch', 'Default branch', <FormikField as={Input} id="project-defaultBranch" name="defaultBranch" placeholder="main" />)}
      <FieldDescription className="form-help">This is the project repository. Giga Desk does not need access to it; a connected worker uses its own approved local checkout.</FieldDescription>
      <Button type="submit" disabled={form.isSubmitting}>{form.isSubmitting ? 'Adding…' : 'Add project'}</Button>
      {feedback?.error && <Alert variant="destructive"><AlertDescription>{feedback.error}</AlertDescription></Alert>}
      {feedback?.success && <Alert role="status"><AlertDescription>{feedback.success}</AlertDescription></Alert>}
    </FieldGroup></Form>;
  }}</Formik></CardContent></Card>;
}
