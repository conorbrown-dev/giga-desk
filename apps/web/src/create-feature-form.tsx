import { ErrorMessage, Field as FormikField, Form, Formik } from 'formik';
import { useRef, useState } from 'react';
import * as Yup from 'yup';
import { Alert, AlertDescription } from './components/ui/alert.js';
import { Button } from './components/ui/button.js';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card.js';
import { Checkbox } from './components/ui/checkbox.js';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './components/ui/collapsible.js';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from './components/ui/field.js';
import { Input } from './components/ui/input.js';
import { Textarea } from './components/ui/textarea.js';
import { createFeature, createWorkItem, type CreateFeatureInput, type VisualReferenceInput } from './project-api.js';

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
const schema = (kind: 'feature' | 'work item') => Yup.object({
  title: Yup.string().trim().max(200).required(`Enter a ${kind} title.`),
  description: Yup.string().max(10_000),
  acceptanceCriteria: Yup.string().required('Add at least one acceptance criterion.').test('criteria', 'Use 1–50 criteria, one per line (1,000 characters maximum each).', (value) => { const items = criteria(value); return items.length > 0 && items.length <= 50 && items.every((item) => item.length <= 1_000); }),
  visualReferences: Yup.array().max(3, 'Attach at most three images.').of(Yup.mixed<File>()
    .test('type', 'Use PNG, JPEG, or WebP images.', (file) => !file || supportedImageTypes.has(file.type))
    .test('size', 'Each image must be 3 MB or smaller.', (file) => !file || file.size <= 3_000_000)),
});

interface CreateWorkFormProps { projectId: string; featureId?: string; onCreated: () => void }

function CreateWorkForm({ projectId, featureId, onCreated }: CreateWorkFormProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const kind = featureId ? 'work item' : 'feature';
  const fieldPrefix = featureId ? `work-item-${featureId}` : 'feature';
  return <Collapsible className="action-panel" open={open} onOpenChange={setOpen}><CollapsibleTrigger render={<Button variant="outline" size={featureId ? 'sm' : 'default'} />}>Add {kind}</CollapsibleTrigger><CollapsibleContent><Card><CardHeader><CardTitle>{kind === 'feature' ? 'Feature details' : 'Work item details'}</CardTitle></CardHeader><CardContent><Formik<FeatureFormValues> initialValues={initialValues} validationSchema={schema(kind)} onSubmit={async (values, { resetForm, setStatus }) => {
    setStatus(undefined);
    try { const visualReferences = await Promise.all(values.visualReferences.map(encodeImage)); const input: CreateFeatureInput = { title: values.title, description: values.description, acceptanceCriteria: criteria(values.acceptanceCriteria), visualReviewRequired: values.visualReviewRequired || visualReferences.length > 0, ...(visualReferences.length > 0 ? { visualReferences } : {}) }; await (featureId ? createWorkItem(projectId, featureId, input) : createFeature(projectId, input)); resetForm(); if (fileInput.current) fileInput.current.value = ''; setOpen(false); onCreated(); }
    catch (reason: unknown) { setStatus({ error: reason instanceof Error ? reason.message : `Unable to create the ${kind}.` }); }
  }}>{(form) => {
    const status: unknown = form.status;
    const feedback = isFeatureFormStatus(status) ? status : undefined;
    return <Form><FieldGroup>
      <Field data-invalid={Boolean(form.errors.title && form.touched.title)}><FieldLabel htmlFor={`${fieldPrefix}-title`}>Title</FieldLabel><FormikField as={Input} id={`${fieldPrefix}-title`} name="title" aria-invalid={Boolean(form.errors.title && form.touched.title)} /><ErrorMessage name="title" render={(message) => <FieldError>{message}</FieldError>} /></Field>
      <Field data-invalid={Boolean(form.errors.description && form.touched.description)}><FieldLabel htmlFor={`${fieldPrefix}-description`}>Description</FieldLabel><FormikField as={Textarea} id={`${fieldPrefix}-description`} name="description" rows="4" aria-invalid={Boolean(form.errors.description && form.touched.description)} /><ErrorMessage name="description" render={(message) => <FieldError>{message}</FieldError>} /></Field>
      <Field data-invalid={Boolean(form.errors.acceptanceCriteria && form.touched.acceptanceCriteria)}><FieldLabel htmlFor={`${fieldPrefix}-criteria`}>Acceptance criteria</FieldLabel><FormikField as={Textarea} id={`${fieldPrefix}-criteria`} name="acceptanceCriteria" rows="4" placeholder="One testable outcome per line" aria-invalid={Boolean(form.errors.acceptanceCriteria && form.touched.acceptanceCriteria)} /><ErrorMessage name="acceptanceCriteria" render={(message) => <FieldError>{message}</FieldError>} /></Field>
      <Field data-invalid={Boolean(form.errors.visualReferences && form.touched.visualReferences)}><FieldLabel htmlFor={`${fieldPrefix}-visual-references`}>Visual references</FieldLabel><Input id={`${fieldPrefix}-visual-references`} ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => { void form.setFieldValue('visualReferences', Array.from(event.currentTarget.files ?? [])); }} /><FieldDescription>Up to three PNG, JPEG, or WebP screenshots, 3 MB each.</FieldDescription><ErrorMessage name="visualReferences" render={(message) => <FieldError>{message}</FieldError>} /></Field>
      <Field orientation="horizontal"><Checkbox id={`${fieldPrefix}-visual-review-required`} checked={form.values.visualReviewRequired} onCheckedChange={(checked) => { void form.setFieldValue('visualReviewRequired', checked); }} /><FieldContent><FieldLabel htmlFor={`${fieldPrefix}-visual-review-required`}>Require desktop and mobile screenshot review</FieldLabel></FieldContent></Field>
      <Button type="submit" disabled={form.isSubmitting}>{form.isSubmitting ? 'Adding…' : `Create ${kind}`}</Button>
      {feedback?.error && <Alert variant="destructive"><AlertDescription>{feedback.error}</AlertDescription></Alert>}
    </FieldGroup></Form>;
  }}</Formik></CardContent></Card></CollapsibleContent></Collapsible>;
}

export function CreateFeatureForm(props: Omit<CreateWorkFormProps, 'featureId'>) { return <CreateWorkForm {...props} />; }
export function CreateWorkItemForm(props: CreateWorkFormProps & { featureId: string }) { return <CreateWorkForm {...props} />; }
