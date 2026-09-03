import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaCodexTargetProvisioner } from '../src/execution/infrastructure/prisma-codex-target.provisioner.js';
import { PrismaOpenCodeTargetProvisioner } from '../src/execution/infrastructure/prisma-opencode-target.provisioner.js';
import { PrismaService } from '../src/shared/infrastructure/prisma.service.js';
import './test-environment.js';

const suffix = randomUUID().slice(0, 8);
const database = new PrismaService();
const nodeName = `Codex Node ${suffix}`;
const agentVersion = `test-${suffix}`;
const openCodeNodeName = `OpenCode Node ${suffix}`;
const openCodeAgentName = `MIRIAM ${suffix}`;
const openCodeModel = `ollama/qwen-test-${suffix}`;
let priorAgents: readonly { id: string; enabled: boolean }[] = [];
let priorModel: { id: string; enabled: boolean } | null = null;

beforeAll(async () => {
  priorAgents = await database.agent.findMany({ where: { name: 'Codex CLI' }, select: { id: true, enabled: true } });
  priorModel = await database.aiModel.findUnique({
    where: { provider_modelIdentifier: { provider: 'OpenAI', modelIdentifier: 'codex-cli-default' } },
    select: { id: true, enabled: true },
  });
});

afterAll(async () => {
  await database.executionNode.deleteMany({ where: { name: nodeName } });
  await database.executionNode.deleteMany({ where: { name: openCodeNodeName } });
  await database.agent.deleteMany({ where: { name: 'Codex CLI', version: agentVersion } });
  await database.agent.deleteMany({ where: { name: openCodeAgentName } });
  await database.aiModel.deleteMany({ where: { modelIdentifier: openCodeModel, executions: { none: {} } } });
  await Promise.all(priorAgents.map((agent) => database.agent.update({
    where: { id: agent.id }, data: { enabled: agent.enabled },
  })));
  if (priorModel) {
    await database.aiModel.update({ where: { id: priorModel.id }, data: { enabled: priorModel.enabled } });
  } else {
    await database.aiModel.deleteMany({
      where: { provider: 'OpenAI', modelIdentifier: 'codex-cli-default', executions: { none: {} } },
    });
  }
  await database.$disconnect();
});

describe('Codex target provisioner', () => {
  it('idempotently provisions compatible node, agent, and model records', async () => {
    const provisioner = new PrismaCodexTargetProvisioner(database);
    const input = {
      nodeName, hostname: 'miriam.local', operatingSystem: 'Linux', architecture: 'x64', agentVersion,
    };
    const first = await provisioner.provision(input);
    const second = await provisioner.provision({ ...input, hostname: 'miriam-updated.local' });

    expect(second).toEqual(first);
    const [node, agent, model] = await Promise.all([
      database.executionNode.findUniqueOrThrow({ where: { id: first.executionNodeId } }),
      database.agent.findUniqueOrThrow({ where: { id: first.agentId } }),
      database.aiModel.findUniqueOrThrow({ where: { id: first.modelId } }),
    ]);
    expect(node).toMatchObject({ hostname: 'miriam-updated.local', status: 'Offline', enabled: true });
    expect(agent).toMatchObject({ name: 'Codex CLI', agentType: 'CodexCli', enabled: true });
    expect(model).toMatchObject({ provider: 'OpenAI', modelIdentifier: 'codex-cli-default', enabled: true });
  });

  it('provisions OpenCode with a custom agent name and provider model', async () => {
    const target = await new PrismaOpenCodeTargetProvisioner(database).provision({
      nodeName: openCodeNodeName, agentName: openCodeAgentName, hostname: 'miriam.local', operatingSystem: 'Linux', architecture: 'x64',
      agentVersion: '1.18.26', modelIdentifier: openCodeModel,
    });
    const [node, agent, model] = await Promise.all([
      database.executionNode.findUniqueOrThrow({ where: { id: target.executionNodeId } }),
      database.agent.findUniqueOrThrow({ where: { id: target.agentId } }),
      database.aiModel.findUniqueOrThrow({ where: { id: target.modelId } }),
    ]);
    expect(node).toMatchObject({ name: openCodeNodeName, capabilities: { agentTypes: ['OpenCode'], modelProviders: ['ollama'] } });
    expect(agent).toMatchObject({ name: openCodeAgentName, agentType: 'OpenCode', supportedModelProviders: ['ollama'] });
    expect(model).toMatchObject({ provider: 'ollama', modelIdentifier: openCodeModel });
  });
});
