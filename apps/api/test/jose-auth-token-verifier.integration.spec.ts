import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { exportJWK, generateKeyPair, SignJWT, type CryptoKey } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { JoseAuthTokenVerifier } from '../src/auth/infrastructure/jose-auth-token-verifier.js';

let server: Server;
let privateKey: CryptoKey;
let verifier: JoseAuthTokenVerifier;

beforeAll(async () => {
  const keys = await generateKeyPair('RS256');
  privateKey = keys.privateKey;
  const publicKey = { ...await exportJWK(keys.publicKey), alg: 'RS256', kid: 'test-key', use: 'sig' };
  server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ keys: [publicKey] }));
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address() as AddressInfo;
  process.env['AUTH_ISSUER'] = 'https://issuer.example/';
  process.env['AUTH_AUDIENCE'] = 'giga-desk-api';
  process.env['AUTH_JWKS_URL'] = `http://127.0.0.1:${address.port.toString()}/jwks`;
  verifier = new JoseAuthTokenVerifier();
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
});

describe('JoseAuthTokenVerifier', () => {
  it('verifies signature and claims from the configured JWKS', async () => {
    const token = await new SignJWT({ realm_access: { roles: ['projects:read', 'offline_access'] } })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer('https://issuer.example/')
      .setAudience('giga-desk-api')
      .setSubject('user-123')
      .setIssuedAt()
      .setExpirationTime('2m')
      .sign(privateKey);

    await expect(verifier.verify(token)).resolves.toEqual({
      subject: 'user-123', permissions: ['projects:read'], executionNodeId: null,
    });
  });
});
