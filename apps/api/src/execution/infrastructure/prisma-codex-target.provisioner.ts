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
    const agentType = input.agentType ?? 'CodexAppServer';
    const agentName = input.agentName ?? (agentType === 'CodexAppServer' ? 'Codex App Server' : agentType === 'CodexSdk' ? 'Codex SDK' : 'Claude Agent SDK');
    const provider = agentType === 'ClaudeAgentSdk' ? 'Anthropic' : 'OpenAI';
    const modelIdentifier = input.modelIdentifier ?? (agentType === 'ClaudeAgentSdk' ? 'claude-sonnet-5' : 'codex-cli-default');
    return this.database.$transaction(async (transaction) => {
      const node = await transaction.executionNode.upsert({
        where: input.executionNodeId ? { id: input.executionNodeId } : { name: input.nodeName },
        create: {
          ...(input.executionNodeId ? { id: input.executionNodeId } : {}), name: input.nodeName, description: 'Agent SDK execution host', hostname: input.hostname,
          operatingSystem: input.operatingSystem, architecture: input.architecture, status: 'Offline',
          capabilities: { agentTypes: [agentType], modelProviders: [provider] },
          maximumConcurrentJobs: 1, tags: ['agent-sdk'],
        },
        update: {
          name: input.nodeName, description: 'Agent SDK execution host', hostname: input.hostname,
          operatingSystem: input.operatingSystem, architecture: input.architecture, enabled: true,
          tags: ['agent-sdk'],
        },
      });
      const existingCapabilities = node.capabilities && typeof node.capabilities === 'object' && !Array.isArray(node.capabilities) ? node.capabilities as Record<string, unknown> : {};
      const agentTypes = Array.isArray(existingCapabilities['agentTypes']) ? existingCapabilities['agentTypes'].filter((value): value is string => typeof value === 'string') : [];
      const modelProviders = Array.isArray(existingCapabilities['modelProviders']) ? existingCapabilities['modelProviders'].filter((value): value is string => typeof value === 'string') : [];
      await transaction.executionNode.update({ where: { id: node.id }, data: { capabilities: { ...existingCapabilities, agentTypes: [...new Set([...agentTypes, agentType])], modelProviders: [...new Set([...modelProviders, provider])] } } });
      await transaction.agent.updateMany({
        where: { name: agentName, version: { not: input.agentVersion } }, data: { enabled: false },
      });
      const agent = await transaction.agent.upsert({
        where: { name_version: { name: agentName, version: input.agentVersion } },
        create: {
          name: agentName, agentType, version: input.agentVersion,
          supportedCapabilities: ['code', 'tests', 'source-control'],
          configuration: { runtime: agentType, sandbox: 'workspace-write' },
          supportedModelProviders: [provider],
        },
        update: { enabled: true },
      });
      const model = await transaction.aiModel.upsert({
        where: { provider_modelIdentifier: { provider, modelIdentifier } },
        create: {
          displayName: agentName, provider, modelIdentifier,
          modelType: 'Coding', location: 'Remote', capabilities: ['code', 'text'],
          notes: `Uses the model configured by the ${agentName} installation.`,
        },
        update: { enabled: true },
      });
      return { executionNodeId: node.id, agentId: agent.id, modelId: model.id };
    });
  }
}
