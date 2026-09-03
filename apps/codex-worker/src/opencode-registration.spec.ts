import { describe, expect, it } from 'vitest';
import { resolveOpenCodeRegistration, type OpenCodeRegistrationReader } from './opencode-registration.js';

const host: OpenCodeRegistrationReader = {
  hostname: () => 'miriam.local', platform: () => 'linux', arch: () => 'x64', version: () => 'OpenCode 1.18.26',
};

describe('OpenCode registration metadata', () => {
  it('derives host metadata and applies the preferred defaults', () => {
    expect(resolveOpenCodeRegistration({}, host)).toEqual({
      agentName: 'MIRIAM', modelIdentifier: 'ollama/qwen3-coder-next:q4_K_M', hostname: 'miriam.local',
      operatingSystem: 'linux', architecture: 'x64', agentVersion: '1.18.26',
    });
  });

  it('accepts explicit agent and model choices and rejects unknown versions', () => {
    expect(resolveOpenCodeRegistration({ GIGA_DESK_WORKER_AGENT_NAME: 'LOCAL', GIGA_DESK_WORKER_MODEL_IDENTIFIER: 'anthropic/claude' }, host))
      .toMatchObject({ agentName: 'LOCAL', modelIdentifier: 'anthropic/claude' });
    expect(() => resolveOpenCodeRegistration({}, { ...host, version: () => 'unknown' })).toThrow('Could not determine');
  });
});
