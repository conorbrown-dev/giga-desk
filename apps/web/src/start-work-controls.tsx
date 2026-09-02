import { ErrorMessage, Field, Form, Formik } from 'formik';
import type { ChangeEvent } from 'react';
import { useEffect, useState } from 'react';
import * as Yup from 'yup';
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
  if (loadError) return <section aria-labelledby="start-work-heading"><h2 id="start-work-heading">Start work</h2><p role="alert">{loadError}</p></section>;
  if (!targets) return <section aria-labelledby="start-work-heading"><h2 id="start-work-heading">Start work</h2><p>Loading execution targets…</p></section>;
  const availableNodes = targets.nodes.filter((node) => node.status === 'Online' && node.currentJobCount < node.maximumConcurrentJobs);
  if (availableNodes.length === 0 || targets.agents.length === 0 || targets.models.length === 0) return <section aria-labelledby="start-work-heading"><h2 id="start-work-heading">Start work</h2><p role="alert">No compatible execution targets are currently available.</p></section>;
  return <section className="card" aria-labelledby="start-work-heading"><h2 id="start-work-heading">Start work</h2><p>Choose where and how this work will run.</p><Formik<ExecutionSelection> initialValues={initialValues} validationSchema={schema} onSubmit={async (values) => {
    setSubmitError(null); setQueued(false);
    try { await createExecution(workItemId, values); setQueued(true); onQueued(); }
    catch (reason: unknown) { setSubmitError(reason instanceof Error ? reason.message : 'Unable to start work.'); }
  }}>{({ values, isSubmitting, setFieldValue }) => {
    const agent = targets.agents.find((candidate) => candidate.id === values.agentId);
    const models = agent ? targets.models.filter((model) => agent.supportedModelProviders.includes(model.provider)) : targets.models;
    return <Form className="form-grid"><label>Execution node<Field as="select" name="executionNodeId"><option value="">Select a node</option>{availableNodes.map((node) => <option value={node.id} key={node.id}>{node.name}</option>)}</Field><ErrorMessage name="executionNodeId" component="span" /></label><label>Agent<Field as="select" name="agentId" onChange={(event: ChangeEvent<HTMLSelectElement>) => { void setFieldValue('agentId', event.target.value); void setFieldValue('modelId', ''); }}><option value="">Select an agent</option>{targets.agents.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.name} · {candidate.version}</option>)}</Field><ErrorMessage name="agentId" component="span" /></label><label>Model<Field as="select" name="modelId"><option value="">Select a model</option>{models.map((model) => <option value={model.id} key={model.id}>{model.displayName} · {model.location}</option>)}</Field><ErrorMessage name="modelId" component="span" /></label><label className="checkbox-row"><Field type="checkbox" name="protectedActionsApproved" />Approve protected production actions</label><p className="form-help">Check only after reviewing this task if it may change production data, authentication, infrastructure, cost, or public access.</p><button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Starting…' : 'Start work'}</button>{submitError && <p role="alert">{submitError}</p>}{queued && <p role="status">Execution queued.</p>}</Form>;
  }}</Formik></section>;
}
