import { ErrorMessage, Field as FormikField, Form, Formik } from 'formik';
import * as Yup from 'yup';
import { createIdea, type CreateIdeaInput } from './ideas-api.js';
import { Alert, AlertDescription } from './components/ui/alert.js';
import { Button } from './components/ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card.js';
import { Field, FieldError, FieldGroup, FieldLabel } from './components/ui/field.js';
import { Input } from './components/ui/input.js';
import { Textarea } from './components/ui/textarea.js';

const initialValues: CreateIdeaInput = { title: '', description: '' };
const schema = Yup.object({
  title: Yup.string().trim().max(200, 'Keep the title under 200 characters.').required('Enter an idea title.'),
  description: Yup.string().trim().max(10_000, 'Keep the description under 10,000 characters.').required('Describe the idea.'),
});

export function CreateIdeaForm({ organizationId, onCancel, onCreated }: { organizationId: string; onCancel: () => void; onCreated: (title: string) => void }) {
  return <Card className="my-4" aria-labelledby="create-idea-heading"><CardHeader><CardTitle id="create-idea-heading">Propose an idea</CardTitle><CardDescription>Capture the opportunity and the context stakeholders need to discuss it.</CardDescription></CardHeader><CardContent><Formik<CreateIdeaInput> initialValues={initialValues} validationSchema={schema} onSubmit={async (values, { setStatus }) => {
    setStatus(undefined);
    try { await createIdea(organizationId, values); onCreated(values.title.trim()); }
    catch (reason: unknown) { setStatus(reason instanceof Error ? reason.message : 'Unable to create the idea.'); }
  }}>{(form) => <Form><FieldGroup>
    <Field data-invalid={Boolean(form.errors.title && form.touched.title)}><FieldLabel htmlFor="idea-title">Title</FieldLabel><FormikField as={Input} id="idea-title" name="title" autoFocus aria-invalid={Boolean(form.errors.title && form.touched.title)} /><ErrorMessage name="title" render={(message) => <FieldError>{message}</FieldError>} /></Field>
    <Field data-invalid={Boolean(form.errors.description && form.touched.description)}><FieldLabel htmlFor="idea-description">Description</FieldLabel><FormikField as={Textarea} id="idea-description" name="description" rows="5" aria-invalid={Boolean(form.errors.description && form.touched.description)} /><ErrorMessage name="description" render={(message) => <FieldError>{message}</FieldError>} /></Field>
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={form.isSubmitting}>{form.isSubmitting ? 'Creating…' : 'Create idea'}</Button><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button></div>
    {typeof form.status === 'string' && <Alert variant="destructive"><AlertDescription>{form.status}</AlertDescription></Alert>}
  </FieldGroup></Form>}</Formik></CardContent></Card>;
}
