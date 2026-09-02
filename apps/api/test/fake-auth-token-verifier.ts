import { AuthTokenVerifier, type AuthenticatedPrincipal } from '../src/auth/application/auth-token-verifier.js';

export class FakeAuthTokenVerifier extends AuthTokenVerifier {
  verify(token: string): Promise<AuthenticatedPrincipal> {
    if (token === 'read-only-token') {
      return Promise.resolve({ subject: 'viewer-123', permissions: ['projects:read'], executionNodeId: null });
    }
    if (token.startsWith('worker-')) return Promise.resolve({
      subject: `worker:${token.slice(7)}`, permissions: ['agent:jobs'], executionNodeId: token.slice(7),
    });
    if (token !== 'valid-token') return Promise.reject(new Error('Invalid token'));
    return Promise.resolve({
      subject: 'user-123',
      permissions: ['projects:read', 'projects:create', 'work-items:create', 'work-items:update',
        'work-items:read', 'executions:read', 'executions:create'],
      executionNodeId: null,
    });
  }
}
