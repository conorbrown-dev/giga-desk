import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma.service.js';
import { OpenCodeTargetProvisioner, type OpenCodeTargetInput, type ProvisionedOpenCodeTarget, validateOpenCodeTargetInput } from '../application/opencode-target-provisioner.js';

@Injectable()
export class PrismaOpenCodeTargetProvisioner extends OpenCodeTargetProvisioner {
  constructor(private readonly database: PrismaService) { super(); }

  async provision(input: OpenCodeTargetInput): Promise<ProvisionedOpenCodeTarget> {
    validateOpenCodeTargetInput(input);
    const separator = input.modelIdentifier.indexOf('/');
    const provider = separator > 0 ? input.modelIdentifier.slice(0, separator) : '';
    if (!provider || separator === input.modelIdentifier.length - 1) throw new Error('modelIdentifier must use provider/model format');
    return this.database.$transaction(async (transaction) => {
      const node = await transaction.executionNode.upsert({
        where: input.executionNodeId ? { id: input.executionNodeId } : { name: input.nodeName }, create: {
        ...(input.executionNodeId ? { id: input.executionNodeId } : {}),
        name: input.nodeName, description: 'OpenCode execution host', hostname: input.hostname,
        operatingSystem: input.operatingSystem, architecture: input.architecture, status: 'Offline',
        capabilities: { agentTypes: ['OpenCode'], modelProviders: [provider] }, maximumConcurrentJobs: 1, tags: ['opencode'],
      }, update: { name: input.nodeName, hostname: input.hostname, operatingSystem: input.operatingSystem, architecture: input.architecture, enabled: true,
        capabilities: { agentTypes: ['OpenCode'], modelProviders: [provider] }, tags: ['opencode'] } });
      const agent = await transaction.agent.upsert({ where: { name_version: { name: input.agentName, version: input.agentVersion } }, create: {
        name: input.agentName, agentType: 'OpenCode', version: input.agentVersion, supportedCapabilities: ['code', 'tests', 'source-control'],
        configuration: { command: 'opencode run', output: 'json-events', sandbox: 'worker-configured' }, supportedModelProviders: [provider],
      }, update: { enabled: true } });
      const model = await transaction.aiModel.upsert({ where: { provider_modelIdentifier: { provider, modelIdentifier: input.modelIdentifier } }, create: {
        displayName: `${input.agentName} default`, provider, modelIdentifier: input.modelIdentifier, modelType: 'Coding', location: 'Remote', capabilities: ['code', 'text'],
        notes: 'Uses the model configured for the local OpenCode installation.',
      }, update: { enabled: true, displayName: `${input.agentName} default` } });
      return { executionNodeId: node.id, agentId: agent.id, modelId: model.id };
    });
  }
}
