import { PrismaCodexTargetProvisioner } from './execution/infrastructure/prisma-codex-target.provisioner.js';
import { PrismaService } from './shared/infrastructure/prisma.service.js';

const [nodeName, hostname, operatingSystem, architecture, agentVersion] = process.argv.slice(2);
const database = new PrismaService();

try {
  const target = await new PrismaCodexTargetProvisioner(database).provision({
    nodeName: nodeName ?? '', hostname: hostname ?? '', operatingSystem: operatingSystem ?? '',
    architecture: architecture ?? '', agentVersion: agentVersion ?? '',
  });
  process.stdout.write(`${JSON.stringify(target)}\n`);
} finally {
  await database.$disconnect();
}
