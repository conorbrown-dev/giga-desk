import { ErrorMessage, Field as FormikField, Form, Formik } from 'formik';
import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
import * as Yup from 'yup';
import { Alert, AlertDescription } from './components/ui/alert.js';
import { Button } from './components/ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card.js';
import { Checkbox } from './components/ui/checkbox.js';
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from './components/ui/field.js';
import { NativeSelect, NativeSelectOption } from './components/ui/native-select.js';
import { Skeleton } from './components/ui/skeleton.js';
import { createExecution, fetchExecutionTargets, type ExecutionSelection, type ExecutionTargets } from './execution-api.js';

const schema = Yup.object({
  executionNodeId: Yup.string().required('Choose an execution node.'),
  agentId: Yup.string().required('Choose an agent.'),
  modelId: Yup.string().required('Choose a model.'),
  protectedActionsApproved: Yup.boolean().required(),
});
const initialValues: ExecutionSelection = {
  executionNodeId: '', agentId: '', modelId: '', protectedActionsApproved: false,
};

export function StartWorkControls({ workItemId, onQueued }: { workItemId: string; onQueued: () => void }) {
  const [targets, setTargets] = useState<ExecutionTargets | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  useEffect(() => {
    const request = new AbortController();
    fetchExecutionTargets(request.signal).then(setTargets).catch((reason: unknown) => {
      if (!request.signal.aborted) setLoadError(reason instanceof Error ? reason.message : 'Execution targets are unavailable.');
    });
    return () => { request.abort(); };
  }, []);
  if (loadError) return <Card aria-labelledby="start-work-heading"><CardHeader><CardTitle id="start-work-heading">Start work</CardTitle></CardHeader><CardContent><Alert variant="destructive"><AlertDescription>{loadError}</AlertDescription></Alert></CardContent></Card>;
  if (!targets) return <Card aria-labelledby="start-work-heading" aria-busy="true"><CardHeader><CardTitle id="start-work-heading">Start work</CardTitle></CardHeader><CardContent className="grid gap-3"><Skeleton className="h-4 w-52" /><Skeleton className="h-8 w-full" /></CardContent></Card>;
  const availableNodes = targets.nodes.filter((node) => node.status === 'Online' && node.currentJobCount < node.maximumConcurrentJobs);
  if (availableNodes.length === 0 || targets.agents.length === 0 || targets.models.length === 0) return <Card aria-labelledby="start-work-heading"><CardHeader><CardTitle id="start-work-heading">Start work</CardTitle></CardHeader><CardContent><Alert><AlertDescription>No compatible execution targets are currently available.</AlertDescription></Alert></CardContent></Card>;
  return <Card className="card" aria-labelledby="start-work-heading"><CardHeader><CardTitle id="start-work-heading">Start work</CardTitle><CardDescription>Choose where and how this work will run.</CardDescription></CardHeader><CardContent><Formik<ExecutionSelection> initialValues={initialValues} validationSchema={schema} onSubmit={async (values) => {
    setSubmitError(null); setQueued(false);
    try { await createExecution(workItemId, values); setQueued(true); onQueued(); }
    catch (reason: unknown) { setSubmitError(reason instanceof Error ? reason.message : 'Unable to start work.'); }
  }}>{({ values, isSubmitting, setFieldValue }) => {
    const node = availableNodes.find((candidate) => candidate.id === values.executionNodeId);
    const agents = node ? targets.agents.filter((candidate) => node.capabilities.agentTypes?.includes(candidate.agentType)) : [];
    const agent = agents.find((candidate) => candidate.id === values.agentId);
    const models = node && agent ? targets.models.filter((model) => node.capabilities.modelProviders?.includes(model.provider) && agent.supportedModelProviders.includes(model.provider)) : [];
    const selectionFeedback = node && agents.length === 0 ? 'This execution node has no compatible agents.' : agent && models.length === 0 ? 'This agent has no compatible models on the selected node.' : null;
    return <Form><FieldGroup className="form-grid">
      <Field><FieldLabel htmlFor="execution-node">Execution node</FieldLabel><FormikField as={NativeSelect} className="w-full" id="execution-node" name="executionNodeId" onChange={(event: ChangeEvent<HTMLSelectElement>) => { void setFieldValue('executionNodeId', event.target.value); void setFieldValue('agentId', ''); void setFieldValue('modelId', ''); }}><NativeSelectOption value="">Select a node</NativeSelectOption>{availableNodes.map((candidate) => <NativeSelectOption value={candidate.id} key={candidate.id}>{candidate.name}</NativeSelectOption>)}</FormikField><ErrorMessage name="executionNodeId" render={(message) => <FieldError>{message}</FieldError>} /></Field>
      <Field><FieldLabel htmlFor="execution-agent">Agent</FieldLabel><FormikField as={NativeSelect} className="w-full" id="execution-agent" name="agentId" disabled={!node || agents.length === 0} onChange={(event: ChangeEvent<HTMLSelectElement>) => { void setFieldValue('agentId', event.target.value); void setFieldValue('modelId', ''); }}><NativeSelectOption value="">{node ? 'Select an agent' : 'Select a node first'}</NativeSelectOption>{agents.map((candidate) => <NativeSelectOption value={candidate.id} key={candidate.id}>{candidate.name} · {candidate.version}</NativeSelectOption>)}</FormikField><ErrorMessage name="agentId" render={(message) => <FieldError>{message}</FieldError>} /></Field>
      <Field><FieldLabel htmlFor="execution-model">Model</FieldLabel><FormikField as={NativeSelect} className="w-full" id="execution-model" name="modelId" disabled={!agent || models.length === 0}><NativeSelectOption value="">{agent ? 'Select a model' : 'Select an agent first'}</NativeSelectOption>{models.map((model) => <NativeSelectOption value={model.id} key={model.id}>{model.displayName} · {model.location}</NativeSelectOption>)}</FormikField><ErrorMessage name="modelId" render={(message) => <FieldError>{message}</FieldError>} /></Field>
      {selectionFeedback && <Alert variant="destructive"><AlertDescription>{selectionFeedback}</AlertDescription></Alert>}
      <Field orientation="horizontal"><Checkbox id="protected-actions" checked={values.protectedActionsApproved} onCheckedChange={(checked) => { void setFieldValue('protectedActionsApproved', checked); }} /><FieldContent><FieldLabel htmlFor="protected-actions">Approve protected production actions</FieldLabel><FieldDescription>Check only after reviewing this task if it may change production data, authentication, infrastructure, cost, or public access.</FieldDescription></FieldContent></Field>
      <Button type="submit" disabled={isSubmitting || Boolean(selectionFeedback)}>{isSubmitting ? 'Starting…' : 'Start work'}</Button>
      {submitError && <Alert variant="destructive"><AlertDescription>{submitError}</AlertDescription></Alert>}
      {queued && <Alert role="status"><AlertDescription>Execution queued.</AlertDescription></Alert>}
    </FieldGroup></Form>;
  }}</Formik></CardContent></Card>;
}
