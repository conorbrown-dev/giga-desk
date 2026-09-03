import { PrismaService } from './shared/infrastructure/prisma.service.js';
import { PrismaOpenCodeTargetProvisioner } from './execution/infrastructure/prisma-opencode-target.provisioner.js';

const required = (name: string, value: string | undefined): string => {
  const result = value?.trim();
  if (!result) throw new Error(`${name} is required`);
  return result;
};
const [nodeName, agentName, hostname, operatingSystem, architecture, agentVersion, modelIdentifier] = process.argv.slice(2);
const database = new PrismaService();
try {
  const target = await new PrismaOpenCodeTargetProvisioner(database).provision({
    nodeName: required('nodeName', nodeName), agentName: required('agentName', agentName), hostname: required('hostname', hostname),
    operatingSystem: required('operatingSystem', operatingSystem), architecture: required('architecture', architecture),
    agentVersion: required('agentVersion', agentVersion), modelIdentifier: required('modelIdentifier', modelIdentifier),
  });
  process.stdout.write(`${JSON.stringify(target)}\n`);
} finally { await database.$disconnect(); }
