import { Command, CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { OpenCodeTargetProvisioner, type ProvisionedOpenCodeTarget } from './opencode-target-provisioner.js';

export interface OpenCodeRegistration {
  agentName: string; hostname: string; operatingSystem: string; architecture: string;
  agentVersion: string; modelIdentifier: string;
}

export class RegisterOpenCodeTargetCommand extends Command<ProvisionedOpenCodeTarget> {
  constructor(readonly nodeId: string, readonly registration: OpenCodeRegistration) { super(); }
}

@CommandHandler(RegisterOpenCodeTargetCommand)
export class RegisterOpenCodeTargetHandler implements ICommandHandler<RegisterOpenCodeTargetCommand> {
  constructor(private readonly targets: OpenCodeTargetProvisioner) {}

  execute(command: RegisterOpenCodeTargetCommand): Promise<ProvisionedOpenCodeTarget> {
    return this.targets.provision({ executionNodeId: command.nodeId, nodeName: command.registration.agentName,
      ...command.registration });
  }
}
