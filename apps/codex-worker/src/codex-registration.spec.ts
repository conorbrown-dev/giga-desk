import { describe, expect, it } from 'vitest';
import { resolveCodexRegistration, type CodexRegistrationReader } from './codex-registration.js';

const host: CodexRegistrationReader = {
  hostname: () => 'codex.local', platform: () => 'linux', arch: () => 'x64', version: () => 'codex-cli 0.152.0',
};

describe('Codex registration metadata', () => {
  it('derives host metadata and the installed CLI version', () => {
    expect(resolveCodexRegistration(host)).toEqual({
      hostname: 'codex.local', operatingSystem: 'linux', architecture: 'x64', agentVersion: '0.152.0',
    });
  });

  it('rejects an unparseable CLI version', () => {
    expect(() => resolveCodexRegistration({ ...host, version: () => 'unknown' })).toThrow('Could not determine');
  });
});
