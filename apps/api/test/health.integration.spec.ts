import { Test } from '@nestjs/testing';
import request from 'supertest';
import { describe, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { AuthTokenVerifier } from '../src/auth/application/auth-token-verifier.js';
import { configureApplication } from '../src/configure-application.js';
import { FakeAuthTokenVerifier } from './fake-auth-token-verifier.js';
import './test-environment.js';

describe('health API', () => {
  it('reports application readiness', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthTokenVerifier)
      .useClass(FakeAuthTokenVerifier)
      .compile();
    const app = moduleRef.createNestApplication();
    configureApplication(app);
    await app.init();

    const server = app.getHttpServer() as Parameters<typeof request>[0];
    await request(server).get('/api/health').expect(200, { status: 'ok' });
    await app.close();
  });
});
