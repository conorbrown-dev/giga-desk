import { describe, expect, it } from 'vitest';
import { validateOpenCodeTargetInput, type OpenCodeTargetInput } from './opencode-target-provisioner.js';

const input: OpenCodeTargetInput = { nodeName: 'MIRIAM', agentName: 'MIRIAM', hostname: 'miriam.local', operatingSystem: 'Linux', architecture: 'x64', agentVersion: '1.18.26', modelIdentifier: 'openai/gpt-5' };

describe('OpenCode target provisioning', () => {
  it('accepts a custom agent name', () => { expect(() => { validateOpenCodeTargetInput(input); }).not.toThrow(); });
  it('rejects an empty custom agent name', () => { expect(() => { validateOpenCodeTargetInput({ ...input, agentName: ' ' }); }).toThrow('agentName is required'); });
});
