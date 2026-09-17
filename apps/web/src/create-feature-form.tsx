import { ErrorMessage, Field as FormikField, Form, Formik } from 'formik';
import { useRef } from 'react';
import * as Yup from 'yup';
import { Alert, AlertDescription } from './components/ui/alert.js';
import { Button } from './components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card.js';
import { Checkbox } from './components/ui/checkbox.js';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from './components/ui/field.js';
import { Input } from './components/ui/input.js';
import { Textarea } from './components/ui/textarea.js';
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
  return <details className="action-panel"><summary>Add feature</summary><Card><CardHeader><CardTitle id="create-feature-heading">Feature details</CardTitle></CardHeader><CardContent><Formik<FeatureFormValues> initialValues={initialValues} validationSchema={schema} onSubmit={async (values, { resetForm, setStatus }) => {
    setStatus(undefined);
    try { const visualReferences = await Promise.all(values.visualReferences.map(encodeImage)); await createFeature(projectId, { title: values.title, description: values.description, acceptanceCriteria: criteria(values.acceptanceCriteria), visualReviewRequired: values.visualReviewRequired || visualReferences.length > 0, ...(visualReferences.length > 0 ? { visualReferences } : {}) }); resetForm(); if (fileInput.current) fileInput.current.value = ''; onCreated(); }
    catch (reason: unknown) { setStatus({ error: reason instanceof Error ? reason.message : 'Unable to create the feature.' }); }
  }}>{(form) => {
    const status: unknown = form.status;
    const feedback = isFeatureFormStatus(status) ? status : undefined;
    return <Form><FieldGroup>
      <Field data-invalid={Boolean(form.errors.title && form.touched.title)}><FieldLabel htmlFor="feature-title">Title</FieldLabel><FormikField as={Input} id="feature-title" name="title" aria-invalid={Boolean(form.errors.title && form.touched.title)} /><ErrorMessage name="title" render={(message) => <FieldError>{message}</FieldError>} /></Field>
      <Field data-invalid={Boolean(form.errors.description && form.touched.description)}><FieldLabel htmlFor="feature-description">Description</FieldLabel><FormikField as={Textarea} id="feature-description" name="description" rows="4" aria-invalid={Boolean(form.errors.description && form.touched.description)} /><ErrorMessage name="description" render={(message) => <FieldError>{message}</FieldError>} /></Field>
      <Field data-invalid={Boolean(form.errors.acceptanceCriteria && form.touched.acceptanceCriteria)}><FieldLabel htmlFor="feature-criteria">Acceptance criteria</FieldLabel><FormikField as={Textarea} id="feature-criteria" name="acceptanceCriteria" rows="4" placeholder="One testable outcome per line" aria-invalid={Boolean(form.errors.acceptanceCriteria && form.touched.acceptanceCriteria)} /><ErrorMessage name="acceptanceCriteria" render={(message) => <FieldError>{message}</FieldError>} /></Field>
      <Field data-invalid={Boolean(form.errors.visualReferences && form.touched.visualReferences)}><FieldLabel htmlFor="feature-visual-references">Visual references</FieldLabel><Input id="feature-visual-references" ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => { void form.setFieldValue('visualReferences', Array.from(event.currentTarget.files ?? [])); }} /><FieldDescription>Up to three PNG, JPEG, or WebP screenshots, 3 MB each.</FieldDescription><ErrorMessage name="visualReferences" render={(message) => <FieldError>{message}</FieldError>} /></Field>
      <Field orientation="horizontal"><Checkbox id="visual-review-required" checked={form.values.visualReviewRequired} onCheckedChange={(checked) => { void form.setFieldValue('visualReviewRequired', checked); }} /><FieldContent><FieldLabel htmlFor="visual-review-required">Require desktop and mobile screenshot review</FieldLabel></FieldContent></Field>
      <Button type="submit" disabled={form.isSubmitting}>{form.isSubmitting ? 'Adding…' : 'Create feature'}</Button>
      {feedback?.error && <Alert variant="destructive"><AlertDescription>{feedback.error}</AlertDescription></Alert>}
    </FieldGroup></Form>;
  }}</Formik></CardContent></Card></details>;
}
