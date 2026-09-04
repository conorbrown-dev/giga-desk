import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.js';
import './test-environment.js';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) throw new Error('DATABASE_URL is required for integration tests');
const database = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const suffix = randomUUID().slice(0, 8);

afterAll(async () => {
  await database.deployment.deleteMany({ where: { executionJob: { requestedBy: `test-${suffix}` } } });
  await database.executionJob.deleteMany({ where: { requestedBy: `test-${suffix}` } });
  await database.executionNode.deleteMany({ where: { name: `Node ${suffix}` } });
  await database.agent.deleteMany({ where: { name: `Agent ${suffix}` } });
  await database.aiModel.deleteMany({ where: { modelIdentifier: `model-${suffix}` } });
  await database.project.deleteMany({ where: { key: `EX${suffix.toUpperCase()}` } });
  await database.$disconnect();
});

describe('execution persistence', () => {
  it('persists separate node, agent, model, and execution-job relationships', async () => {
    const project = await database.project.create({ data: {
      key: `EX${suffix.toUpperCase()}`, name: 'Execution Fixture', description: 'Fixture', businessGoal: 'Verify execution',
      repositoryUrl: 'https://github.com/example/execution-fixture.git', defaultBranch: 'main',
      workItems: { create: { type: 'Feature', title: 'Execute work', description: 'Run agent' } },
    }, include: { workItems: true } });
    const workItem = project.workItems[0];
    if (!workItem) throw new Error('Expected execution fixture WorkItem');
    const node = await database.executionNode.create({ data: {
      name: `Node ${suffix}`, hostname: 'worker.local', operatingSystem: 'Linux', architecture: 'x64',
      status: 'Online', capabilities: { agents: ['test'] }, maximumConcurrentJobs: 2,
    } });
    const agent = await database.agent.create({ data: {
      name: `Agent ${suffix}`, agentType: 'Simulator', version: '1.0.0', supportedCapabilities: ['code'],
      configuration: {}, supportedModelProviders: ['Local'],
    } });
    const model = await database.aiModel.create({ data: {
      displayName: `Model ${suffix}`, provider: 'Local', modelIdentifier: `model-${suffix}`,
      modelType: 'Coding', contextWindow: 32_768, location: 'Local', capabilities: ['text'],
    } });
    const createdJob = await database.executionJob.create({ data: {
      workItemId: workItem.id, executionNodeId: node.id, agentId: agent.id, modelId: model.id,
      requestedBy: `test-${suffix}`,
    } });
    const job = await database.executionJob.findUniqueOrThrow({
      where: { id: createdJob.id }, include: { workItem: true, executionNode: true, agent: true, model: true },
    });

    expect(job.status).toBe('Queued');
    expect([job.executionNode.name, job.agent.name, job.model.modelIdentifier]).toEqual([
      `Node ${suffix}`, `Agent ${suffix}`, `model-${suffix}`,
    ]);
    await database.executionProgress.create({ data: {
      executionJobId: job.id, phase: 'Implementation', message: 'Repository inspected', idempotencyKey: 'progress-1',
    } });
    await expect(database.executionProgress.create({ data: {
      executionJobId: job.id, phase: 'Implementation', message: 'Duplicate', idempotencyKey: 'progress-1',
    } })).rejects.toThrow();
    await database.testResult.create({ data: {
      executionJobId: job.id, type: 'Unit', result: 'Passed', testCount: 12, durationMs: 300,
      idempotencyKey: 'tests-1',
    } });
    await database.deployment.create({ data: {
      projectId: project.id, workItemId: workItem.id, executionJobId: job.id, environment: 'Staging',
      status: 'Succeeded', completedAt: new Date(), url: 'https://staging.example.test', idempotencyKey: 'deploy-1',
    } });
    const evidence = await database.executionJob.findUniqueOrThrow({ where: { id: job.id }, include: {
      progress: true, testResults: true, deployments: true,
    } });
    expect([evidence.progress.length, evidence.testResults.length, evidence.deployments.length]).toEqual([1, 1, 1]);
  });
});
