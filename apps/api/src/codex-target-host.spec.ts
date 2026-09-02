import { describe, expect, it } from 'vitest';
import { resolveCodexTargetInput, type HostMetadataReader } from './codex-target-host.js';

const reader: HostMetadataReader = {
  hostname: () => 'test-host', platform: () => 'linux', arch: () => 'x64', codexVersion: () => 'codex-cli 0.152.1',
};

describe('Codex target host metadata', () => {
  it('builds a target from the current host when no arguments are supplied', () => {
    expect(resolveCodexTargetInput([], reader)).toEqual({
      nodeName: 'test-host', hostname: 'test-host', operatingSystem: 'linux', architecture: 'x64', agentVersion: '0.152.1',
    });
  });

  it('retains explicit target metadata overrides', () => {
    expect(resolveCodexTargetInput(['MIRIAM', 'miriam.local', 'Linux', 'x86_64', '0.152.0'], reader)).toEqual({
      nodeName: 'MIRIAM', hostname: 'miriam.local', operatingSystem: 'Linux', architecture: 'x86_64', agentVersion: '0.152.0',
    });
  });

  it('rejects partial metadata and unparseable Codex versions', () => {
    expect(() => resolveCodexTargetInput(['only-name'], reader)).toThrow('Usage:');
    expect(() => resolveCodexTargetInput([], { ...reader, codexVersion: () => 'unknown' })).toThrow('Could not determine');
  });
});
