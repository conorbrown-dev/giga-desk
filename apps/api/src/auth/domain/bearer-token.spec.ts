import { describe, expect, it } from 'vitest';
import { parseBearerToken } from './bearer-token.js';

describe('BearerToken', () => {
  it('extracts a case-insensitive bearer credential', () => {
    expect(parseBearerToken('BEARER signed-token')).toBe('signed-token');
  });

  it.each([undefined, '', 'Basic value', 'Bearer', 'Bearer one two'])(
    'rejects an invalid authorization header: %s',
    (header) => {
      expect(() => parseBearerToken(header)).toThrow('A single bearer token is required');
    },
  );
});
