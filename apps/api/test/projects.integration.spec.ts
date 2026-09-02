import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { AuthTokenVerifier } from '../src/auth/application/auth-token-verifier.js';
import { configureApplication } from '../src/configure-application.js';
import { PrismaService } from '../src/shared/infrastructure/prisma.service.js';
import { FakeAuthTokenVerifier } from './fake-auth-token-verifier.js';
import './test-environment.js';

const projectInput = {
  key: 'CREATE', name: 'Create Project API', description: 'First command', businessGoal: 'Track delivery',
};
const visualReferenceContent = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(149_992),
]);
const featureInput = {
  title: 'Project board', description: 'Show delivery state', acceptanceCriteria: ['Feature appears on the board'],
  visualReviewRequired: false,
  visualReferences: [{ name: 'railway.png', mediaType: 'image/png', dataBase64: visualReferenceContent.toString('base64') }],
};

describe('projects API', () => {
  let app: INestApplication;
  let database: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthTokenVerifier)
      .useClass(FakeAuthTokenVerifier)
      .compile();
    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
    database = app.get(PrismaService);
    await database.project.deleteMany({ where: { key: projectInput.key } });
  });

  afterAll(async () => {
    await database.project.deleteMany({ where: { key: projectInput.key } });
    await app.close();
  });

  it('authorizes, validates, persists, audits, and rejects a duplicate key', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server).post('/api/projects').send(projectInput).expect(401);
    await request(server).post('/api/projects').set('Authorization', 'Bearer read-only-token').send(projectInput).expect(403);
    await request(server).post('/api/projects').set('Authorization', 'Bearer valid-token')
      .send({ ...projectInput, unexpected: true }).expect(400);

    const response = await request(server).post('/api/projects').set('Authorization', 'Bearer valid-token')
      .send(projectInput).expect(201);
    expect(response.body).toMatchObject({ key: projectInput.key, name: projectInput.name, status: 'Idea' });
    const stored = await database.project.findUniqueOrThrow({
      where: { key: projectInput.key }, include: { activities: true },
    });
    expect(stored.activities).toHaveLength(1);
    expect(stored.activities[0]?.actorId).toBe('user-123');
    await request(server).get('/api/projects').expect(401);
    const listResponse = await request(server).get('/api/projects')
      .set('Authorization', 'Bearer read-only-token').expect(200);
    expect(listResponse.body).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: stored.id, key: projectInput.key, priority: 'Medium' }),
    ]));
    await request(server).post(`/api/projects/${stored.id}/features`)
      .set('Authorization', 'Bearer read-only-token').send(featureInput).expect(403);
    await request(server).post(`/api/projects/${stored.id}/features`)
      .set('Authorization', 'Bearer valid-token').send({ ...featureInput, acceptanceCriteria: [] }).expect(400);
    await request(server).post(`/api/projects/${stored.id}/features`)
      .set('Authorization', 'Bearer valid-token').send({ ...featureInput,
        visualReferences: [{ ...featureInput.visualReferences[0], mediaType: 'image/gif' }] }).expect(400);
    const featureResponse = await request(server).post(`/api/projects/${stored.id}/features`)
      .set('Authorization', 'Bearer valid-token').send(featureInput).expect(201);
    expect(featureResponse.body).toMatchObject({
      projectId: stored.id, type: 'Feature', title: featureInput.title, status: 'Backlog',
      acceptanceCriteria: featureInput.acceptanceCriteria,
      visualReferences: [{ name: 'railway.png', mediaType: 'image/png' }],
      visualReviewRequired: true,
    });
    const featureBody: unknown = featureResponse.body;
    if (typeof featureBody !== 'object' || featureBody === null || !('id' in featureBody)
      || typeof featureBody.id !== 'string') throw new Error('Expected a created Feature identifier');
    const feature = await database.workItem.findUniqueOrThrow({
      where: { id: featureBody.id }, include: { criteria: true, activities: true, visualReferences: true },
    });
    expect(feature.criteria.map((criterion) => criterion.text)).toEqual(featureInput.acceptanceCriteria);
    expect(feature.visualReviewRequired).toBe(true);
    expect(feature.visualReferences).toHaveLength(1);
    expect(feature.visualReferences[0]).toMatchObject({ name: 'railway.png', mediaType: 'image/png', sortOrder: 0 });
    expect(Buffer.from(feature.visualReferences[0]?.content ?? [])).toEqual(visualReferenceContent);
    expect(feature.activities[0]?.actorId).toBe('user-123');
    const workItemsResponse = await request(server).get(`/api/projects/${stored.id}/work-items`)
      .set('Authorization', 'Bearer read-only-token').expect(200);
    expect(workItemsResponse.body).toEqual([expect.objectContaining({
      id: feature.id, type: 'Feature', status: 'Backlog',
      criteria: [expect.objectContaining({ text: featureInput.acceptanceCriteria[0], satisfied: false })],
    })]);
    await request(server).get('/api/projects/00000000-0000-4000-8000-000000000001/work-items')
      .set('Authorization', 'Bearer read-only-token').expect(404);
    await request(server).patch(`/api/work-items/${feature.id}/status`)
      .set('Authorization', 'Bearer read-only-token').send({ status: 'Ready' }).expect(403);
    await request(server).patch(`/api/work-items/${feature.id}/status`)
      .set('Authorization', 'Bearer valid-token').send({ status: 'Completed' }).expect(409);
    await request(server).patch(`/api/work-items/${feature.id}/status`)
      .set('Authorization', 'Bearer valid-token').send({ status: 'Ready' }).expect(200, {
        id: feature.id, status: 'Ready',
      });
    const statusActivities = await database.activity.findMany({
      where: { workItemId: feature.id, eventType: 'WorkItemStatusChanged' },
    });
    expect(statusActivities).toHaveLength(1);
    expect(statusActivities[0]?.metadata).toEqual({ from: 'Backlog', to: 'Ready' });
    await request(server).patch('/api/work-items/00000000-0000-4000-8000-000000000001/status')
      .set('Authorization', 'Bearer valid-token').send({ status: 'Ready' }).expect(404);
    await request(server).post('/api/projects/00000000-0000-4000-8000-000000000001/features')
      .set('Authorization', 'Bearer valid-token').send(featureInput).expect(404);
    await request(server).post('/api/projects').set('Authorization', 'Bearer valid-token')
      .send(projectInput).expect(409, { message: 'Project key already exists', error: 'Conflict', statusCode: 409 });
  });
});
