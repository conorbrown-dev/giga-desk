import { describe, expect, it } from 'vitest';
import { resolveOpenCodeTargetInput, type OpenCodeHostMetadataReader } from './opencode-target-host.js';

const reader: OpenCodeHostMetadataReader = {
  hostname: () => 'miriam.local', platform: () => 'linux', arch: () => 'x64', openCodeVersion: () => '1.18.26',
};

describe('OpenCode target host metadata', () => {
  it('derives host metadata and version while accepting only agent and model', () => {
    expect(resolveOpenCodeTargetInput(['MIRIAM', 'ollama/qwen3-coder-next:q4_K_M'], reader)).toEqual({
      nodeName: 'miriam.local', agentName: 'MIRIAM', hostname: 'miriam.local', operatingSystem: 'linux', architecture: 'x64',
      agentVersion: '1.18.26', modelIdentifier: 'ollama/qwen3-coder-next:q4_K_M',
    });
  });

  it('rejects metadata arguments and an unparseable version', () => {
    expect(() => resolveOpenCodeTargetInput(['MIRIAM'], reader)).toThrow('Usage:');
    expect(() => resolveOpenCodeTargetInput(['MIRIAM', 'ollama/qwen'], { ...reader, openCodeVersion: () => 'unknown' })).toThrow('Could not determine');
  });
});
