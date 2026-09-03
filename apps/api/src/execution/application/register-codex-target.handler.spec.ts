import { describe, expect, it, vi } from 'vitest';
import { CodexTargetProvisioner } from './codex-target-provisioner.js';
import { RegisterCodexTargetCommand, RegisterCodexTargetHandler } from './register-codex-target.command.js';

describe('RegisterCodexTargetHandler', () => {
  it('binds worker-reported metadata to the authenticated node ID', async () => {
    const provision = vi.fn<CodexTargetProvisioner['provision']>()
      .mockResolvedValue({ executionNodeId: 'node-1', agentId: 'agent-1', modelId: 'model-1' });
    const registration = { hostname: 'codex.local', operatingSystem: 'linux', architecture: 'x64', agentVersion: '0.152.0' };
    await new RegisterCodexTargetHandler({ provision }).execute(new RegisterCodexTargetCommand('node-1', registration));
    expect(provision).toHaveBeenCalledWith({ executionNodeId: 'node-1', nodeName: 'codex.local', ...registration });
  });
});
