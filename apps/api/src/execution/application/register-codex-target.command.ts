import { Command, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { CodexTargetProvisioner, type ProvisionedCodexTarget } from './codex-target-provisioner.js';

export interface CodexRegistration {
  hostname: string; operatingSystem: string; architecture: string; agentVersion: string;
}

export class RegisterCodexTargetCommand extends Command<ProvisionedCodexTarget> {
  constructor(readonly nodeId: string, readonly registration: CodexRegistration) { super(); }
}

@CommandHandler(RegisterCodexTargetCommand)
export class RegisterCodexTargetHandler implements ICommandHandler<RegisterCodexTargetCommand> {
  constructor(private readonly targets: CodexTargetProvisioner) {}

  execute(command: RegisterCodexTargetCommand): Promise<ProvisionedCodexTarget> {
    return this.targets.provision({ executionNodeId: command.nodeId, nodeName: command.registration.hostname,
      ...command.registration });
  }
}
