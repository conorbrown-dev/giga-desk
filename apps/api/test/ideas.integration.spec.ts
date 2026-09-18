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

describe('Ideas API', () => {
  const organizationName = 'Authenticated Idea Creation Integration';
  let app: INestApplication;
  let database: PrismaService;
  let organizationId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthTokenVerifier).useClass(FakeAuthTokenVerifier).compile();
    app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
    database = app.get(PrismaService);
    await database.organization.deleteMany({ where: { name: organizationName } });
    const organization = await database.organization.create({
      data: { name: organizationName, members: { create: { subject: 'user-123', role: 'Coworker' } } },
    });
    organizationId = organization.id;
  });

  afterAll(async () => {
    await database.organization.deleteMany({ where: { name: organizationName } });
    await app.close();
  });

  it('allows an authenticated coworker to validate, create, and read an Idea', async () => {
    const server = app.getHttpServer() as Parameters<typeof request>[0];
    const endpoint = `/api/organizations/${organizationId}/ideas`;
    const input = { title: ' Customer advisory group ', description: ' Validate demand before delivery. ' };

    await request(server).post(endpoint).send(input).expect(401);
    await request(server).post(endpoint).set('Authorization', 'Bearer read-only-token').send(input).expect(403);
    await request(server).post(endpoint).set('Authorization', 'Bearer valid-token').send({ title: '', description: '' }).expect(400);
    const response = await request(server).post(endpoint).set('Authorization', 'Bearer valid-token').send(input).expect(201);
    expect(response.body).toMatchObject({ organizationId, title: 'Customer advisory group', description: 'Validate demand before delivery.', status: 'Open', createdBy: 'user-123' });

    const list = await request(server).get(endpoint).set('Authorization', 'Bearer valid-token').expect(200);
    expect(list.body).toEqual([expect.objectContaining({ id: response.body.id, title: 'Customer advisory group', comments: [] })]);
    await expect(database.idea.findUniqueOrThrow({ where: { id: response.body.id as string } }))
      .resolves.toMatchObject({ organizationId, createdBy: 'user-123' });
  });
});
