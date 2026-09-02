import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { AuthTokenVerifier, type AuthenticatedPrincipal } from '../application/auth-token-verifier.js';

const appPermissions = new Set([
  'projects:read', 'projects:create', 'work-items:create', 'work-items:update',
  'work-items:read', 'executions:read', 'executions:create', 'agent:jobs',
]);

const stringArray = (value: unknown): readonly string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const realmRoles = (value: unknown): readonly string[] => {
  if (!value || typeof value !== 'object') return [];
  return stringArray(Reflect.get(value, 'roles'));
};

const requiredSetting = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

export class JoseAuthTokenVerifier extends AuthTokenVerifier {
  private readonly issuer = requiredSetting('AUTH_ISSUER');
  private readonly audience = requiredSetting('AUTH_AUDIENCE');
  private readonly keys: JWTVerifyGetKey = createRemoteJWKSet(new URL(requiredSetting('AUTH_JWKS_URL')));

  async verify(token: string): Promise<AuthenticatedPrincipal> {
    const { payload } = await jwtVerify(token, this.keys, {
      algorithms: ['RS256'],
      audience: this.audience,
      issuer: this.issuer,
    });
    if (!payload.sub) throw new Error('Token subject is required');
    const permissions = [...new Set([
      ...stringArray(payload['permissions']),
      ...realmRoles(payload['realm_access']),
    ])].filter((permission) => appPermissions.has(permission));
    const executionNodeId = typeof payload['execution_node_id'] === 'string' ? payload['execution_node_id'] : null;
    return { subject: payload.sub, permissions, executionNodeId };
  }
}
