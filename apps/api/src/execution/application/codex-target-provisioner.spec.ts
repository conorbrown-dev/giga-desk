import { describe, expect, it } from 'vitest';
import { validateCodexTargetInput } from './codex-target-provisioner.js';

const input = {
  nodeName: 'MIRIAM', hostname: 'miriam.local', operatingSystem: 'Linux', architecture: 'x64', agentVersion: '0.152.0',
};

describe('Codex target provisioning', () => {
  it('accepts a complete execution target description', () => {
    expect(() => { validateCodexTargetInput(input); }).not.toThrow();
  });

  it('rejects missing machine or agent identity fields', () => {
    expect(() => { validateCodexTargetInput({ ...input, hostname: ' ' }); }).toThrow('hostname is required');
  });
});
