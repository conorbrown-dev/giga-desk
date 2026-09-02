import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma.service.js';
import { ExecutionTargetQueries } from '../application/execution-target-queries.js';
import type { ExecutionTargetRegistry, JsonValue } from '../application/list-execution-targets.query.js';

@Injectable()
export class PrismaExecutionTargetQueries extends ExecutionTargetQueries {
  constructor(private readonly database: PrismaService) {
    super();
  }

  async listEnabled(): Promise<ExecutionTargetRegistry> {
    const [nodes, agents, models] = await Promise.all([
      this.database.executionNode.findMany({
        where: { enabled: true, status: { not: 'Disabled' } }, orderBy: { name: 'asc' },
        select: { id: true, name: true, status: true, lastHeartbeatAt: true, maximumConcurrentJobs: true,
          currentJobCount: true, capabilities: true, tags: true },
      }),
      this.database.agent.findMany({
        where: { enabled: true }, orderBy: [{ name: 'asc' }, { version: 'desc' }],
        select: { id: true, name: true, agentType: true, version: true, supportedCapabilities: true,
          supportedModelProviders: true },
      }),
      this.database.aiModel.findMany({
        where: { enabled: true }, orderBy: [{ provider: 'asc' }, { displayName: 'asc' }],
        select: { id: true, displayName: true, provider: true, modelIdentifier: true, modelType: true,
          contextWindow: true, location: true, capabilities: true },
      }),
    ]);
    return {
      nodes: nodes.map((node) => {
        if (node.status === 'Disabled') throw new Error('Disabled execution node returned by enabled registry query');
        return { ...node, status: node.status, lastHeartbeatAt: node.lastHeartbeatAt?.toISOString() ?? null,
          capabilities: node.capabilities as JsonValue };
      }),
      agents: agents.map((agent) => ({ ...agent, supportedCapabilities: agent.supportedCapabilities as JsonValue })),
      models: models.map((model) => ({ ...model, capabilities: model.capabilities as JsonValue })),
    };
  }
}
