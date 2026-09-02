import { ErrorMessage, Field, Form, Formik } from 'formik';
import * as Yup from 'yup';
import { createFeature } from './project-api.js';

interface FeatureFormValues { title: string; description: string; acceptanceCriteria: string }
const initialValues: FeatureFormValues = { title: '', description: '', acceptanceCriteria: '' };
const criteria = (value: string): readonly string[] => value.split('\n').map((item) => item.trim()).filter(Boolean);
const schema = Yup.object({
  title: Yup.string().trim().max(200).required('Enter a feature title.'),
  description: Yup.string().max(10_000),
  acceptanceCriteria: Yup.string().required('Add at least one acceptance criterion.').test('criteria', 'Use 1–50 criteria, one per line (1,000 characters maximum each).', (value) => { const items = criteria(value); return items.length > 0 && items.length <= 50 && items.every((item) => item.length <= 1_000); }),
});

export function CreateFeatureForm({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  return <section className="card" aria-labelledby="create-feature-heading"><h2 id="create-feature-heading">Add feature</h2><Formik<FeatureFormValues> initialValues={initialValues} validationSchema={schema} onSubmit={async (values, { resetForm, setStatus }) => {
    setStatus(undefined);
    try { await createFeature(projectId, { title: values.title, description: values.description, acceptanceCriteria: criteria(values.acceptanceCriteria) }); resetForm(); setStatus({ success: 'Feature created.' }); onCreated(); }
    catch (reason: unknown) { setStatus({ error: reason instanceof Error ? reason.message : 'Unable to create the feature.' }); }
  }}>{({ isSubmitting, status }: { isSubmitting: boolean; status?: { success?: string; error?: string } }) => <Form className="form-grid"><label>Title<Field name="title" /><ErrorMessage name="title" component="span" /></label><label>Description<Field as="textarea" name="description" rows="4" /><ErrorMessage name="description" component="span" /></label><label>Acceptance criteria<Field as="textarea" name="acceptanceCriteria" rows="4" placeholder="One testable outcome per line" /><ErrorMessage name="acceptanceCriteria" component="span" /></label><button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Adding…' : 'Add feature'}</button>{status?.error && <p role="alert">{status.error}</p>}{status?.success && <p role="status">{status.success}</p>}</Form>}</Formik></section>;
}
