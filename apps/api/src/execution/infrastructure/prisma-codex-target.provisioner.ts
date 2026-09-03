import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma.service.js';
import {
  CodexTargetProvisioner,
  type CodexTargetInput,
  type ProvisionedCodexTarget,
  validateCodexTargetInput,
} from '../application/codex-target-provisioner.js';

@Injectable()
export class PrismaCodexTargetProvisioner extends CodexTargetProvisioner {
  constructor(private readonly database: PrismaService) { super(); }

  async provision(input: CodexTargetInput): Promise<ProvisionedCodexTarget> {
    validateCodexTargetInput(input);
    return this.database.$transaction(async (transaction) => {
      const node = await transaction.executionNode.upsert({
        where: input.executionNodeId ? { id: input.executionNodeId } : { name: input.nodeName },
        create: {
          ...(input.executionNodeId ? { id: input.executionNodeId } : {}), name: input.nodeName, description: 'Codex CLI execution host', hostname: input.hostname,
          operatingSystem: input.operatingSystem, architecture: input.architecture, status: 'Offline',
          capabilities: { agentTypes: ['CodexCli'], modelProviders: ['OpenAI'] },
          maximumConcurrentJobs: 1, tags: ['codex'],
        },
        update: {
          name: input.nodeName, description: 'Codex CLI execution host', hostname: input.hostname,
          operatingSystem: input.operatingSystem, architecture: input.architecture, enabled: true,
          capabilities: { agentTypes: ['CodexCli'], modelProviders: ['OpenAI'] }, tags: ['codex'],
        },
      });
      await transaction.agent.updateMany({
        where: { name: 'Codex CLI', version: { not: input.agentVersion } }, data: { enabled: false },
      });
      const agent = await transaction.agent.upsert({
        where: { name_version: { name: 'Codex CLI', version: input.agentVersion } },
        create: {
          name: 'Codex CLI', agentType: 'CodexCli', version: input.agentVersion,
          supportedCapabilities: ['code', 'tests', 'source-control'],
          configuration: { command: 'codex exec', output: 'jsonl', sandbox: 'workspace-write' },
          supportedModelProviders: ['OpenAI'],
        },
        update: { enabled: true },
      });
      const model = await transaction.aiModel.upsert({
        where: { provider_modelIdentifier: { provider: 'OpenAI', modelIdentifier: 'codex-cli-default' } },
        create: {
          displayName: 'Codex CLI default', provider: 'OpenAI', modelIdentifier: 'codex-cli-default',
          modelType: 'Coding', location: 'Remote', capabilities: ['code', 'text'],
          notes: 'Uses the model configured by the authenticated Codex CLI installation.',
        },
        update: { enabled: true },
      });
      return { executionNodeId: node.id, agentId: agent.id, modelId: model.id };
    });
  }
}
