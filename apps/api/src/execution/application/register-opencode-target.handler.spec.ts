import { describe, expect, it, vi } from 'vitest';
import { OpenCodeTargetProvisioner } from './opencode-target-provisioner.js';
import { RegisterOpenCodeTargetCommand, RegisterOpenCodeTargetHandler } from './register-opencode-target.command.js';

describe('RegisterOpenCodeTargetHandler', () => {
  it('binds worker-reported metadata to the authenticated node ID', async () => {
    const provision = vi.fn<OpenCodeTargetProvisioner['provision']>()
      .mockResolvedValue({ executionNodeId: 'node-1', agentId: 'agent-1', modelId: 'model-1' });
    const registration = { agentName: 'MIRIAM', hostname: 'miriam.local', operatingSystem: 'linux',
      architecture: 'x64', agentVersion: '1.18.26', modelIdentifier: 'ollama/qwen' };
    await new RegisterOpenCodeTargetHandler({ provision }).execute(new RegisterOpenCodeTargetCommand('node-1', registration));
    expect(provision).toHaveBeenCalledWith({ executionNodeId: 'node-1', nodeName: 'MIRIAM', ...registration });
  });
});
