import { describe, expect, it } from 'vitest';
import { validateOpenCodeTargetInput, type OpenCodeTargetInput } from './opencode-target-provisioner.js';

const input: OpenCodeTargetInput = { nodeName: 'miriam.local', agentName: 'MIRIAM', hostname: 'miriam.local', operatingSystem: 'Linux', architecture: 'x64', agentVersion: '1.18.26', modelIdentifier: 'ollama/qwen3-coder-next:q4_K_M' };

describe('OpenCode target provisioning', () => {
  it('accepts a custom agent name', () => { expect(() => { validateOpenCodeTargetInput(input); }).not.toThrow(); });
  it('rejects an empty custom agent name', () => { expect(() => { validateOpenCodeTargetInput({ ...input, agentName: ' ' }); }).toThrow('agentName is required'); });
});
