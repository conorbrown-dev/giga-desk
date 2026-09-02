import { AgentApi, type WorkPackage } from './agent-api.js';
import { setTimeout as delay } from 'node:timers/promises';

const key = (jobId: string, stage: string): string => `simulator:${jobId}:${stage}`;
const passedTest = (jobId: string, type: 'Unit' | 'Integration' | 'EndToEnd') => ({
  type, result: 'Passed', testCount: 0, failedTests: [], durationMs: 0,
  idempotencyKey: key(jobId, `test:${type}`),
});

async function simulateSuccess(api: AgentApi, jobId: string, work: WorkPackage): Promise<void> {
  await api.post(jobId, 'start');
  await api.post(jobId, 'progress', {
    phase: 'Simulation', message: `Simulating ${work.workItem.title}`,
    idempotencyKey: key(jobId, 'progress'),
  });
  await api.post(jobId, 'tests', passedTest(jobId, 'Unit'));
  await api.post(jobId, 'tests', passedTest(jobId, 'Integration'));
  await api.post(jobId, 'deployment', {
    environment: 'Staging', status: 'Succeeded', version: 'simulated',
    idempotencyKey: key(jobId, 'deployment'),
  });
  await api.post(jobId, 'tests', passedTest(jobId, 'EndToEnd'));
  await api.post(jobId, 'complete', {
    summary: 'Polling simulator completed the execution lifecycle.',
    satisfiedAcceptanceCriterionIds: work.workItem.acceptanceCriteria.map(({ id }) => id),
    idempotencyKey: key(jobId, 'completion'),
  });
}

export async function simulateNext(api: AgentApi, nodeId: string): Promise<string | null> {
  const [job] = await api.discover(nodeId);
  if (!job) return null;
  await api.post(job.id, 'claim');
  const work = await api.workPackage(job.id);
  await simulateSuccess(api, job.id, work);
  return job.id;
}

export async function poll(
  api: AgentApi,
  nodeId: string,
  intervalMs: number,
  once: boolean,
  signal: AbortSignal,
  report: (message: string) => void,
): Promise<void> {
  let keepPolling = true;
  while (keepPolling) {
    const jobId = await simulateNext(api, nodeId);
    report(jobId ? `Simulated execution ${jobId}` : 'No queued jobs');
    keepPolling = !once && !signal.aborted;
    if (!keepPolling) continue;
    try {
      await delay(jobId ? 0 : intervalMs, undefined, { signal });
    } catch (error) {
      if (!signal.aborted) throw error;
    }
  }
}
