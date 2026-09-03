import { ErrorMessage, Field, Form, Formik } from 'formik';
import { useRef } from 'react';
import * as Yup from 'yup';
import { createFeature, type VisualReferenceInput } from './project-api.js';

interface FeatureFormValues { title: string; description: string; acceptanceCriteria: string;
  visualReferences: readonly File[]; visualReviewRequired: boolean }
const initialValues: FeatureFormValues = { title: '', description: '', acceptanceCriteria: '', visualReferences: [], visualReviewRequired: false };
const criteria = (value: string): readonly string[] => value.split('\n').map((item) => item.trim()).filter(Boolean);
const supportedImageTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);
interface FeatureFormStatus { success?: string; error?: string }
const isFeatureFormStatus = (value: unknown): value is FeatureFormStatus => typeof value === 'object' && value !== null;
const encodeImage = (file: File): Promise<VisualReferenceInput> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => { reject(new Error(`Unable to read ${file.name}.`)); };
  reader.onload = () => {
    const result = reader.result;
    if (typeof result !== 'string' || !result.includes(',')) { reject(new Error(`Unable to read ${file.name}.`)); return; }
    resolve({ name: file.name, mediaType: file.type, dataBase64: result.slice(result.indexOf(',') + 1) });
  };
  reader.readAsDataURL(file);
});
const schema = Yup.object({
  title: Yup.string().trim().max(200).required('Enter a feature title.'),
  description: Yup.string().max(10_000),
  acceptanceCriteria: Yup.string().required('Add at least one acceptance criterion.').test('criteria', 'Use 1–50 criteria, one per line (1,000 characters maximum each).', (value) => { const items = criteria(value); return items.length > 0 && items.length <= 50 && items.every((item) => item.length <= 1_000); }),
  visualReferences: Yup.array().max(3, 'Attach at most three images.').of(Yup.mixed<File>()
    .test('type', 'Use PNG, JPEG, or WebP images.', (file) => !file || supportedImageTypes.has(file.type))
    .test('size', 'Each image must be 3 MB or smaller.', (file) => !file || file.size <= 3_000_000)),
});

export function CreateFeatureForm({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  return <details className="card action-panel"><summary>Add feature</summary><h2 id="create-feature-heading">Feature details</h2><Formik<FeatureFormValues> initialValues={initialValues} validationSchema={schema} onSubmit={async (values, { resetForm, setStatus }) => {
    setStatus(undefined);
    try { const visualReferences = await Promise.all(values.visualReferences.map(encodeImage)); await createFeature(projectId, { title: values.title, description: values.description, acceptanceCriteria: criteria(values.acceptanceCriteria), visualReviewRequired: values.visualReviewRequired || visualReferences.length > 0, ...(visualReferences.length > 0 ? { visualReferences } : {}) }); resetForm(); if (fileInput.current) fileInput.current.value = ''; setStatus({ success: 'Feature created.' }); onCreated(); }
    catch (reason: unknown) { setStatus({ error: reason instanceof Error ? reason.message : 'Unable to create the feature.' }); }
  }}>{(form) => {
    const status: unknown = form.status;
    const feedback = isFeatureFormStatus(status) ? status : undefined;
    return <Form className="form-grid">
      <label>Title<Field name="title" /><ErrorMessage name="title" component="span" /></label>
      <label>Description<Field as="textarea" name="description" rows="4" /><ErrorMessage name="description" component="span" /></label>
      <label>Acceptance criteria<Field as="textarea" name="acceptanceCriteria" rows="4" placeholder="One testable outcome per line" /><ErrorMessage name="acceptanceCriteria" component="span" /></label>
      <label>Visual references<input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => { void form.setFieldValue('visualReferences', Array.from(event.currentTarget.files ?? [])); }} /><span>Up to three PNG, JPEG, or WebP screenshots, 3 MB each.</span><ErrorMessage name="visualReferences" component="span" /></label>
      <label><Field type="checkbox" name="visualReviewRequired" /> Require desktop and mobile screenshot review</label>
      <button type="submit" disabled={form.isSubmitting}>{form.isSubmitting ? 'Adding…' : 'Add feature'}</button>
      {feedback?.error && <p role="alert">{feedback.error}</p>}{feedback?.success && <p role="status">{feedback.success}</p>}
    </Form>;
  }}</Formik></details>;
}
