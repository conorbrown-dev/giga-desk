import { Test } from '@nestjs/testing';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { AuthTokenVerifier } from '../src/auth/application/auth-token-verifier.js';
import { configureApplication } from '../src/configure-application.js';
import { FakeAuthTokenVerifier } from './fake-auth-token-verifier.js';
import './test-environment.js';

describe('authentication API', () => {
  it('rejects missing or invalid credentials and returns a verified identity', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthTokenVerifier)
      .useClass(FakeAuthTokenVerifier)
      .compile();
    const app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();
    const server = app.getHttpServer() as Parameters<typeof request>[0];

    await request(server).get('/api/auth/me').expect(401);
    await request(server).get('/api/auth/me').set('Authorization', 'Bearer invalid').expect(401);
    const response = await request(server).get('/api/auth/me').set('Authorization', 'Bearer valid-token').expect(200);
    expect(response.body).toEqual({
      subject: 'user-123',
      permissions: ['projects:read', 'projects:create', 'work-items:create', 'work-items:update',
        'work-items:read', 'executions:read', 'executions:create'],
      executionNodeId: null,
    });
    await app.close();
  });
});
