import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { AuthTokenVerifier } from '../src/auth/application/auth-token-verifier.js';
import { configureApplication } from '../src/configure-application.js';
import { PrismaService } from '../src/shared/infrastructure/prisma.service.js';
import { FakeAuthTokenVerifier } from './fake-auth-token-verifier.js';
import './test-environment.js';

const suffix = randomUUID().slice(0, 8);
const registeredNodeId = randomUUID();
const registeredCodexNodeId = randomUUID();
const registeredCodexVersion = `1.2.3-test-${suffix}`;
const registeredAgentName = `OpenCode ${suffix}`;
const registeredModel = `ollama/qwen-${suffix}`;
const approvedNodeCapabilities = { agentTypes: ['Simulator'], modelProviders: ['Local'],
  repositoryMappings: [{ url: 'https://github.com/example/start-work.git', path: '/srv/start-work' }] };
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const records = (value: unknown): readonly Record<string, unknown>[] => {
  if (!Array.isArray(value) || !value.every(isRecord)) throw new Error('Expected an array of registry records');
  return value;
};

describe('execution target registry API', () => {
  let app: INestApplication;
  let database: PrismaService;
  let nodeId: string;
  let agentId: string;
  let modelId: string;
  let workItemId: string;
  let failureWorkItemId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthTokenVerifier).useClass(FakeAuthTokenVerifier).compile();
    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.listen(0, '127.0.0.1');
    database = app.get(PrismaService);
    const node = await database.executionNode.create({ data: {
      name: `Registry Node ${suffix}`, hostname: 'registry.local', operatingSystem: 'Linux', architecture: 'x64',
      status: 'Online', capabilities: approvedNodeCapabilities, tags: ['local'],
    } });
    const agent = await database.agent.create({ data: {
      name: `Registry Agent ${suffix}`, agentType: 'Simulator', version: '1.0.0',
      supportedCapabilities: ['code'], configuration: {}, supportedModelProviders: ['Local'],
    } });
    const model = await database.aiModel.create({ data: {
      displayName: `Registry Model ${suffix}`, provider: 'Local', modelIdentifier: `registry-${suffix}`,
      modelType: 'Coding', location: 'Local', capabilities: ['text'],
    } });
    const project = await database.project.create({ data: {
      key: `ST${suffix.toUpperCase()}`, name: 'Start Work Fixture', description: 'Fixture', businessGoal: 'Queue work',
      repositoryUrl: 'https://github.com/example/start-work.git', defaultBranch: 'main',
      workItems: { create: { type: 'Feature', title: 'Queue execution', description: 'Start work', visualReviewRequired: true,
        criteria: { create: { text: 'Execution is queued' } }, visualReferences: { create: {
          name: 'expo.png', mediaType: 'image/png', content: Buffer.from('iVBORw0KGgo=', 'base64'),
        } } } },
    }, include: { workItems: true } });
    const workItem = project.workItems[0];
    if (!workItem) throw new Error('Expected a Start Work fixture');
    nodeId = node.id; agentId = agent.id; modelId = model.id; workItemId = workItem.id;
    const failureProject = await database.project.create({ data: {
      key: `FL${suffix.toUpperCase()}`, name: 'Failure Fixture', description: 'Fixture', businessGoal: 'Fail work',
      repositoryUrl: 'https://github.com/example/start-work.git', defaultBranch: 'main',
      workItems: { create: { type: 'Feature', title: 'Fail execution', description: 'Failure', criteria: { create: { text: 'Failure is recorded' } } } },
    }, include: { workItems: true } });
    const failureItem = failureProject.workItems[0];
    if (!failureItem) throw new Error('Expected a failure fixture');
    failureWorkItemId = failureItem.id;
  });

  afterAll(async () => {
    await database.deployment.deleteMany({ where: { executionJob: { workItemId } } });
    await database.executionJob.deleteMany({ where: { workItemId } });
    await database.executionJob.deleteMany({ where: { workItemId: failureWorkItemId } });
    await database.project.deleteMany({ where: { key: `ST${suffix.toUpperCase()}` } });
    await database.project.deleteMany({ where: { key: `FL${suffix.toUpperCase()}` } });
    await database.executionNode.deleteMany({ where: { name: `Registry Node ${suffix}` } });
    await database.executionNode.deleteMany({ where: { id: registeredNodeId } });
    await database.executionNode.deleteMany({ where: { id: registeredCodexNodeId } });
    await database.agent.deleteMany({ where: { name: `Registry Agent ${suffix}` } });
    await database.agent.deleteMany({ where: { name: registeredAgentName } });
    await database.agent.deleteMany({ where: { name: 'Codex CLI', version: registeredCodexVersion } });
    await database.aiModel.deleteMany({ where: { modelIdentifier: `registry-${suffix}` } });
    await database.aiModel.deleteMany({ where: { modelIdentifier: registeredModel } });
    await app.close();
  });

  it('authorizes and returns enabled nodes, agents, and models', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const registration = { agentName: registeredAgentName, hostname: 'opencode.local', operatingSystem: 'linux',
      architecture: 'x64', agentVersion: '1.18.26', modelIdentifier: registeredModel };
    await request(server).post(`/api/agent/nodes/${registeredNodeId}/opencode-registration`)
      .set('Authorization', 'Bearer worker-00000000-0000-4000-8000-000000000001').send(registration).expect(403);
    await request(server).post(`/api/agent/nodes/${registeredNodeId}/opencode-registration`)
      .set('Authorization', `Bearer worker-${registeredNodeId}`).send(registration).expect(201);
    const registeredNode = await database.executionNode.findUniqueOrThrow({ where: { id: registeredNodeId } });
    expect(registeredNode).toMatchObject({ name: registeredAgentName, status: 'Offline',
      capabilities: { agentTypes: ['OpenCode'], modelProviders: ['ollama'] } });
    await request(server).get('/api/execution/targets').expect(401);
    await request(server).get('/api/execution/targets')
      .set('Authorization', 'Bearer read-only-token').expect(403);
    const response = await request(server).get('/api/execution/targets')
      .set('Authorization', 'Bearer valid-token').expect(200);
    const body: unknown = response.body;
    if (!isRecord(body)) throw new Error('Expected an execution registry response');
    expect(records(body['nodes']).some((node) =>
      node['name'] === `Registry Node ${suffix}` && node['status'] === 'Online')).toBe(true);
    expect(records(body['agents']).some((agent) => agent['name'] === `Registry Agent ${suffix}`)).toBe(true);
    expect(records(body['agents']).some((agent) => agent['name'] === registeredAgentName && agent['agentType'] === 'OpenCode')).toBe(true);
    expect(records(body['models']).some((model) => model['modelIdentifier'] === `registry-${suffix}`)).toBe(true);
    expect(records(body['models']).some((model) => model['modelIdentifier'] === registeredModel)).toBe(true);
    await request(server).put(`/api/execution/targets/${registeredNodeId}/repositories`)
      .set('Authorization', 'Bearer valid-token').send({ mappings: [{ url: 'https://github.com/example/project.git', path: '/srv/project' }] }).expect(200);
    const mappingResponse = await request(server).get(`/api/agent/nodes/${registeredNodeId}/repositories`)
      .set('Authorization', `Bearer worker-${registeredNodeId}`).expect(200);
    expect(mappingResponse.body).toEqual({ mappings: [{ url: 'https://github.com/example/project.git', path: '/srv/project' }] });

    const codexRegistration = { hostname: 'codex.local', operatingSystem: 'linux', architecture: 'x64', agentVersion: registeredCodexVersion };
    await request(server).post(`/api/agent/nodes/${registeredCodexNodeId}/codex-registration`)
      .set('Authorization', 'Bearer worker-00000000-0000-4000-8000-000000000001').send(codexRegistration).expect(403);
    await request(server).post(`/api/agent/nodes/${registeredCodexNodeId}/codex-registration`)
      .set('Authorization', `Bearer worker-${registeredCodexNodeId}`).send(codexRegistration).expect(201);
    const codexNode = await database.executionNode.findUniqueOrThrow({ where: { id: registeredCodexNodeId } });
    expect(codexNode).toMatchObject({ name: 'codex.local', status: 'Offline',
      capabilities: { agentTypes: ['CodexCli'], modelProviders: ['OpenAI'] } });

    await request(server).post(`/api/agent/nodes/${nodeId}/heartbeat`)
      .set('Authorization', 'Bearer worker-00000000-0000-4000-8000-000000000001').expect(403);
    const heartbeat = await request(server).post(`/api/agent/nodes/${nodeId}/heartbeat`)
      .set('Authorization', `Bearer worker-${nodeId}`).expect(201);
    const heartbeatBody: unknown = heartbeat.body;
    if (!isRecord(heartbeatBody) || typeof heartbeatBody['lastHeartbeatAt'] !== 'string') {
      throw new Error('Expected an execution-node heartbeat response');
    }
    expect(heartbeatBody).toMatchObject({ id: nodeId, status: 'Online' });
    const heartbeatingNode = await database.executionNode.findUniqueOrThrow({ where: { id: nodeId } });
    expect(heartbeatingNode.lastHeartbeatAt?.toISOString()).toBe(heartbeatBody['lastHeartbeatAt']);

    const executionInput = { executionNodeId: nodeId, agentId, modelId, protectedActionsApproved: true };
    await request(server).post(`/api/work-items/${workItemId}/executions`)
      .set('Authorization', 'Bearer valid-token').send({ executionNodeId: nodeId, agentId, modelId }).expect(400);
    await request(server).post(`/api/work-items/${workItemId}/executions`)
      .set('Authorization', 'Bearer read-only-token').send(executionInput).expect(403);
    await database.executionNode.update({ where: { id: nodeId }, data: {
      capabilities: { agentTypes: ['Simulator'], modelProviders: ['Local'], repositoryMappings: [] },
    } });
    await request(server).post(`/api/work-items/${workItemId}/executions`)
      .set('Authorization', 'Bearer valid-token').send(executionInput).expect(409);
    await database.executionNode.update({ where: { id: nodeId }, data: { capabilities: approvedNodeCapabilities } });
    const jobResponse = await request(server).post(`/api/work-items/${workItemId}/executions`)
      .set('Authorization', 'Bearer valid-token').send(executionInput).expect(201);
    const jobBody: unknown = jobResponse.body;
    if (!isRecord(jobBody) || typeof jobBody['id'] !== 'string') throw new Error('Expected a queued job');
    expect(jobBody).toMatchObject({ workItemId, executionNodeId: nodeId, agentId, modelId, status: 'Queued',
      protectedActionsApproved: true });
    const [job, workItem, node, activities] = await Promise.all([
      database.executionJob.findUniqueOrThrow({ where: { id: jobBody['id'] } }),
      database.workItem.findUniqueOrThrow({ where: { id: workItemId } }),
      database.executionNode.findUniqueOrThrow({ where: { id: nodeId } }),
      database.activity.findMany({ where: { workItemId } }),
    ]);
    expect([job.status, job.protectedActionsApproved, workItem.status, node.currentJobCount])
      .toEqual(['Queued', true, 'Ready', 1]);
    expect(activities.map((activity) => activity.eventType)).toEqual(expect.arrayContaining([
      'ExecutionRequested', 'WorkItemStatusChanged',
    ]));
    await request(server).post(`/api/work-items/${workItemId}/executions`)
      .set('Authorization', 'Bearer valid-token').send(executionInput).expect(409);
    await request(server).get(`/api/agent/nodes/${nodeId}/jobs`)
      .set('Authorization', 'Bearer worker-00000000-0000-4000-8000-000000000001').expect(403);
    const discovery = await request(server).get(`/api/agent/nodes/${nodeId}/jobs`)
      .set('Authorization', `Bearer worker-${nodeId}`).expect(200);
    const discoveredJobs: unknown = discovery.body;
    expect(records(discoveredJobs).some((job) => job['id'] === jobBody['id'] && job['status'] === 'Queued')).toBe(true);
    await request(server).post(`/api/agent/jobs/${jobBody['id']}/claim`)
      .set('Authorization', `Bearer worker-${nodeId}`).expect(201, { id: jobBody['id'], status: 'Assigned' });
    await request(server).get(`/api/agent/jobs/${jobBody['id']}/work-package`)
      .set('Authorization', 'Bearer worker-00000000-0000-4000-8000-000000000001').expect(404);
    const workPackageResponse = await request(server).get(`/api/agent/jobs/${jobBody['id']}/work-package`)
      .set('Authorization', `Bearer worker-${nodeId}`).expect(200);
    const workPackage: unknown = workPackageResponse.body;
    if (!isRecord(workPackage) || !isRecord(workPackage['project']) || !isRecord(workPackage['workItem'])
      || !isRecord(workPackage['expectations'])) throw new Error('Expected a structured Work Package');
    expect(workPackage['project']['key']).toBe(`ST${suffix.toUpperCase()}`);
    expect(workPackage['workItem']['title']).toBe('Queue execution');
    expect(workPackage['workItem']['visualReferences']).toEqual([{
      name: 'expo.png', mediaType: 'image/png', dataBase64: 'iVBORw0KGgo=',
    }]);
    expect(workPackage['authorization']).toEqual({ protectedActionsApproved: true });
    expect(workPackage['expectations']).toEqual({
      tests: ['Unit', 'Integration', 'EndToEnd'], deploymentRequired: true, visualReviewRequired: true,
    });
    await request(server).post(`/api/agent/jobs/${jobBody['id']}/claim`)
      .set('Authorization', `Bearer worker-${nodeId}`).expect(409);
    const claimedActivity = await database.activity.findFirstOrThrow({ where: {
      workItemId, eventType: 'ExecutionJobClaimed', actorId: `worker:${nodeId}`,
    } });
    expect(claimedActivity.metadata).toEqual({ executionJobId: jobBody['id'], executionNodeId: nodeId });
    const progressInput = { phase: 'Implementation', message: 'Repository inspected', idempotencyKey: 'progress-1' };
    await request(server).post(`/api/agent/jobs/${jobBody['id']}/progress`)
      .set('Authorization', `Bearer worker-${nodeId}`).send(progressInput).expect(409);
    await request(server).post(`/api/agent/jobs/${jobBody['id']}/start`)
      .set('Authorization', 'Bearer worker-00000000-0000-4000-8000-000000000001').expect(404);
    await request(server).post(`/api/agent/jobs/${jobBody['id']}/start`)
      .set('Authorization', `Bearer worker-${nodeId}`).expect(201);
    await request(server).post(`/api/agent/jobs/${jobBody['id']}/start`)
      .set('Authorization', `Bearer worker-${nodeId}`).expect(409);
    await request(server).post(`/api/agent/jobs/${jobBody['id']}/process`)
      .set('Authorization', `Bearer worker-${nodeId}`).send({ processId: 0 }).expect(400);
    await request(server).post(`/api/agent/jobs/${jobBody['id']}/process`)
      .set('Authorization', `Bearer worker-${registeredNodeId}`).send({ processId: 4_321 }).expect(404);
    const registeredProcess = await request(server).post(`/api/agent/jobs/${jobBody['id']}/process`)
      .set('Authorization', `Bearer worker-${nodeId}`).send({ processId: 4_321 }).expect(201);
    await request(server).post(`/api/agent/jobs/${jobBody['id']}/process`)
      .set('Authorization', `Bearer worker-${nodeId}`).send({ processId: 4_321 }).expect(201);
    const registeredProcessBody: unknown = registeredProcess.body;
    if (!isRecord(registeredProcessBody)) throw new Error('Expected a registered process');
    expect(registeredProcessBody['processId']).toBe(4_321);
    expect(typeof registeredProcessBody['startedAt']).toBe('string');
    await request(server).get(`/api/agent/jobs/${jobBody['id']}/control`)
      .set('Authorization', `Bearer worker-${nodeId}`).expect(200, { terminationRequested: false });
    const firstProgress = await request(server).post(`/api/agent/jobs/${jobBody['id']}/progress`)
      .set('Authorization', `Bearer worker-${nodeId}`).send(progressInput).expect(201);
    const retriedProgress = await request(server).post(`/api/agent/jobs/${jobBody['id']}/progress`)
      .set('Authorization', `Bearer worker-${nodeId}`).send({ ...progressInput, message: 'Retry' }).expect(201);
    expect(retriedProgress.body).toEqual(firstProgress.body);
    expect(await database.executionProgress.count({ where: { executionJobId: jobBody['id'] } })).toBe(1);
    await request(app.getHttpServer() as Parameters<typeof request>[0])
      .get(`/api/work-items/${workItemId}/executions/stream`).expect(401);
    const stream = await fetch(`${await app.getUrl()}/api/work-items/${workItemId}/executions/stream`, {
      headers: { Authorization: 'Bearer valid-token' }, signal: AbortSignal.timeout(5_000),
    });
    expect(stream.headers.get('content-type')).toContain('text/event-stream');
    if (!stream.body) throw new Error('Expected an execution event stream');
    const reader = stream.body.getReader();
    let event = '';
    while (!event.includes('Repository inspected')) {
      const chunk = await reader.read();
      if (chunk.done) break;
      event += new TextDecoder().decode(chunk.value);
    }
    await reader.cancel();
    expect(event).toContain('Repository inspected');
    const runningJob = await database.executionJob.findUniqueOrThrow({ where: { id: jobBody['id'] } });
    const runningItem = await database.workItem.findUniqueOrThrow({ where: { id: workItemId } });
    expect([runningJob.status, runningItem.status]).toEqual(['Running', 'InProgress']);
    const testInput = { type: 'Unit', result: 'Passed', testCount: 12, failedTests: [],
      durationMs: 250, idempotencyKey: 'tests-1' };
    const firstTests = await request(server).post(`/api/agent/jobs/${jobBody['id']}/tests`)
      .set('Authorization', `Bearer worker-${nodeId}`).send(testInput).expect(201);
    const retriedTests = await request(server).post(`/api/agent/jobs/${jobBody['id']}/tests`)
      .set('Authorization', `Bearer worker-${nodeId}`).send({ ...testInput, testCount: 99 }).expect(201);
    expect(retriedTests.body).toEqual(firstTests.body);
    await request(server).post(`/api/agent/jobs/${jobBody['id']}/tests`)
      .set('Authorization', `Bearer worker-${nodeId}`).send({
        ...testInput, type: 'EndToEnd', idempotencyKey: 'e2e-too-early',
      }).expect(409);
    const testingJob = await database.executionJob.findUniqueOrThrow({ where: { id: jobBody['id'] } });
    const testingItem = await database.workItem.findUniqueOrThrow({ where: { id: workItemId } });
    expect([testingJob.status, testingItem.status]).toEqual(['Testing', 'Testing']);
    expect(await database.testResult.count({ where: { executionJobId: jobBody['id'] } })).toBe(1);
    await request(server).post(`/api/agent/jobs/${jobBody['id']}/deployment`)
      .set('Authorization', `Bearer worker-${nodeId}`).send({
        environment: 'Staging', status: 'Succeeded', url: 'https://staging.example.test', idempotencyKey: 'too-early',
      }).expect(409);
    await request(server).post(`/api/agent/jobs/${jobBody['id']}/tests`)
      .set('Authorization', `Bearer worker-${nodeId}`).send({
        ...testInput, type: 'Integration', idempotencyKey: 'tests-2',
      }).expect(201);
    const deploymentInput = { environment: 'Staging', status: 'Succeeded', version: 'test-version',
      commitHash: 'abc123', url: 'https://staging.example.test', idempotencyKey: 'deployment-1' };
    const firstDeployment = await request(server).post(`/api/agent/jobs/${jobBody['id']}/deployment`)
      .set('Authorization', `Bearer worker-${nodeId}`).send(deploymentInput).expect(201);
    const retriedDeployment = await request(server).post(`/api/agent/jobs/${jobBody['id']}/deployment`)
      .set('Authorization', `Bearer worker-${nodeId}`).send({ ...deploymentInput, version: 'retry' }).expect(201);
    expect(retriedDeployment.body).toEqual(firstDeployment.body);
    const e2eInput = { ...testInput, type: 'EndToEnd', idempotencyKey: 'tests-e2e' };
    await request(server).post(`/api/agent/jobs/${jobBody['id']}/tests`)
      .set('Authorization', `Bearer worker-${nodeId}`).send(e2eInput).expect(201);
    const e2eJob = await database.executionJob.findUniqueOrThrow({ where: { id: jobBody['id'] } });
    const e2eItem = await database.workItem.findUniqueOrThrow({ where: { id: workItemId } });
    expect([e2eJob.status, e2eItem.status]).toEqual(['E2ETesting', 'E2ETesting']);
    expect(await database.deployment.count({ where: { executionJobId: jobBody['id'] } })).toBe(1);
    const criteria = await database.acceptanceCriterion.findMany({ where: { workItemId }, select: { id: true } });
    const completionInput = {
      summary: 'Implemented and verified', satisfiedAcceptanceCriterionIds: criteria.map((criterion) => criterion.id),
      branchName: 'feature/execution', commitHash: 'abc123', pullRequestUrl: 'https://github.test/pr/1',
      idempotencyKey: 'completion-1',
    };
    await request(server).post(`/api/agent/jobs/${jobBody['id']}/complete`)
      .set('Authorization', `Bearer worker-${nodeId}`).send({ ...completionInput, satisfiedAcceptanceCriterionIds: [] }).expect(409);
    const completion = await request(server).post(`/api/agent/jobs/${jobBody['id']}/complete`)
      .set('Authorization', `Bearer worker-${nodeId}`).send(completionInput).expect(201);
    expect(completion.body).toMatchObject({ id: jobBody['id'], status: 'Completed' });
    const retriedCompletion = await request(server).post(`/api/agent/jobs/${jobBody['id']}/complete`)
      .set('Authorization', `Bearer worker-${nodeId}`).send({ ...completionInput, summary: 'Retry' }).expect(201);
    expect(retriedCompletion.body).toEqual(completion.body);
    const [completedJob, completedItem, completedNode, criterion] = await Promise.all([
      database.executionJob.findUniqueOrThrow({ where: { id: jobBody['id'] } }),
      database.workItem.findUniqueOrThrow({ where: { id: workItemId } }),
      database.executionNode.findUniqueOrThrow({ where: { id: nodeId } }),
      database.acceptanceCriterion.findFirstOrThrow({ where: { workItemId } }),
    ]);
    expect([completedJob.status, completedItem.status, completedNode.currentJobCount, criterion.satisfied])
      .toEqual(['Completed', 'Completed', 0, true]);
    expect((await database.activity.findMany({ where: { workItemId } })).map((activity) => activity.eventType))
      .toEqual(expect.arrayContaining(['ExecutionCompleted', 'WorkItemStatusChanged']));
    const history = await request(server).get(`/api/work-items/${workItemId}/executions`)
      .set('Authorization', 'Bearer valid-token').expect(200);
    const historyBody: unknown = history.body;
    const historyRecords = records(historyBody);
    const completedHistory = historyRecords.find((entry) => entry['id'] === jobBody['id']);
    if (!completedHistory) throw new Error('Expected completed execution history');
    expect(completedHistory['status']).toBe('Completed');
    const completedProcess = completedHistory['process'];
    if (!isRecord(completedProcess)) throw new Error('Expected process history');
    expect(completedProcess).toMatchObject({ id: 4_321, terminationRequestedAt: null });
    expect(typeof completedProcess['startedAt']).toBe('string');
    expect(records(completedHistory['tests']).some((test) => test['type'] === 'EndToEnd' && test['result'] === 'Passed')).toBe(true);
    expect(records(completedHistory['deployments']).some((deployment) => deployment['status'] === 'Succeeded')).toBe(true);

    const failureJob = await request(server).post(`/api/work-items/${failureWorkItemId}/executions`)
      .set('Authorization', 'Bearer valid-token').send({ executionNodeId: nodeId, agentId, modelId,
        protectedActionsApproved: false }).expect(201);
    const failureJobBody: unknown = failureJob.body;
    if (!isRecord(failureJobBody) || typeof failureJobBody['id'] !== 'string') throw new Error('Expected failure job');
    const failureJobId = failureJobBody['id'];
    await request(server).post(`/api/agent/jobs/${failureJobId}/claim`).set('Authorization', `Bearer worker-${nodeId}`).expect(201);
    await request(server).post(`/api/agent/jobs/${failureJobId}/start`).set('Authorization', `Bearer worker-${nodeId}`).expect(201);
    await request(server).post(`/api/agent/jobs/${failureJobId}/process`)
      .set('Authorization', `Bearer worker-${nodeId}`).send({ processId: 9_876 }).expect(201);
    await request(server).post(`/api/work-items/${failureWorkItemId}/executions/${failureJobId}/terminate`)
      .set('Authorization', 'Bearer read-only-token').expect(403);
    const termination = await request(server).post(`/api/work-items/${failureWorkItemId}/executions/${failureJobId}/terminate`)
      .set('Authorization', 'Bearer valid-token').expect(201);
    const terminationBody: unknown = termination.body;
    if (!isRecord(terminationBody)) throw new Error('Expected a termination request');
    expect(typeof terminationBody['terminationRequestedAt']).toBe('string');
    await request(server).post(`/api/work-items/${failureWorkItemId}/executions/${failureJobId}/terminate`)
      .set('Authorization', 'Bearer valid-token').expect(201);
    await request(server).get(`/api/agent/jobs/${failureJobId}/control`)
      .set('Authorization', `Bearer worker-${nodeId}`).expect(200, { terminationRequested: true });
    expect(await database.activity.count({ where: {
      workItemId: failureWorkItemId, eventType: 'ExecutionTerminationRequested', actorId: 'user-123',
    } })).toBe(1);
    const failureInput = { failureReason: 'Agent lost its workspace', idempotencyKey: 'failure-1' };
    const failure = await request(server).post(`/api/agent/jobs/${failureJobId}/fail`)
      .set('Authorization', `Bearer worker-${nodeId}`).send(failureInput).expect(201);
    const retriedFailure = await request(server).post(`/api/agent/jobs/${failureJobId}/fail`)
      .set('Authorization', `Bearer worker-${nodeId}`).send(failureInput).expect(201);
    expect(retriedFailure.body).toEqual(failure.body);
    const [failedJob, blockedItem, releasedNode] = await Promise.all([
      database.executionJob.findUniqueOrThrow({ where: { id: failureJobId } }),
      database.workItem.findUniqueOrThrow({ where: { id: failureWorkItemId } }),
      database.executionNode.findUniqueOrThrow({ where: { id: nodeId } }),
    ]);
    expect([failedJob.status, blockedItem.status, releasedNode.currentJobCount]).toEqual(['Failed', 'Blocked', 0]);
    await database.executionProgress.create({ data: { executionJobId: failureJobId, phase: 'Failure', message: 'Partial evidence', idempotencyKey: 'clear-progress' } });
    await database.testResult.create({ data: { executionJobId: failureJobId, type: 'Unit', result: 'Failed', idempotencyKey: 'clear-test' } });
    await database.deployment.create({ data: { projectId: blockedItem.projectId, workItemId: failureWorkItemId, executionJobId: failureJobId, environment: 'Development', status: 'Failed', idempotencyKey: 'clear-deployment' } });

    await request(server).post(`/api/work-items/${failureWorkItemId}/executions/${failureJobId}/retry`)
      .set('Authorization', 'Bearer read-only-token').expect(403);
    await database.executionNode.update({ where: { id: nodeId }, data: {
      capabilities: { agentTypes: ['Simulator'], modelProviders: ['Local'], repositoryMappings: [] },
    } });
    await request(server).post(`/api/work-items/${failureWorkItemId}/executions/${failureJobId}/retry`)
      .set('Authorization', 'Bearer valid-token').expect(409);
    await database.executionNode.update({ where: { id: nodeId }, data: { capabilities: approvedNodeCapabilities } });
    const retry = await request(server).post(`/api/work-items/${failureWorkItemId}/executions/${failureJobId}/retry`)
      .set('Authorization', 'Bearer valid-token').expect(201);
    const retryBody: unknown = retry.body;
    if (!isRecord(retryBody) || typeof retryBody['id'] !== 'string') throw new Error('Expected a retried job');
    const retryJobId = retryBody['id'];
    expect(retryBody).toMatchObject({ workItemId: failureWorkItemId, status: 'Queued', protectedActionsApproved: false });
    await request(server).post(`/api/work-items/${failureWorkItemId}/executions/${retryJobId}/clear`)
      .set('Authorization', 'Bearer valid-token').expect(201);
    expect(await database.executionJob.findUnique({ where: { id: retryJobId } })).toBeNull();
    await request(server).post(`/api/work-items/${failureWorkItemId}/executions/${failureJobId}/clear`)
      .set('Authorization', 'Bearer valid-token').expect(201);
    const [clearedRetry, clearedFailure, readyItem, clearedActivities, remainingEvidence] = await Promise.all([
      database.executionJob.findUnique({ where: { id: retryJobId } }),
      database.executionJob.findUnique({ where: { id: failureJobId } }),
      database.workItem.findUniqueOrThrow({ where: { id: failureWorkItemId } }),
      database.activity.findMany({ where: { workItemId: failureWorkItemId, eventType: 'ExecutionHistoryCleared' } }),
      Promise.all([database.executionProgress.count({ where: { executionJobId: failureJobId } }), database.testResult.count({ where: { executionJobId: failureJobId } }), database.deployment.count({ where: { executionJobId: failureJobId } })]),
    ]);
    expect([clearedRetry, clearedFailure, readyItem.status, clearedActivities.length, remainingEvidence]).toEqual([null, null, 'Ready', 1, [0, 0, 0]]);
    await request(server).post(`/api/work-items/${workItemId}/executions/${jobBody['id']}/clear`)
      .set('Authorization', 'Bearer valid-token').expect(409);
    await request(server).post(`/api/work-items/${workItemId}/executions/${jobBody['id']}/terminate`)
      .set('Authorization', 'Bearer valid-token').expect(409);
  });
});
