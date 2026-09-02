import { PrismaCodexTargetProvisioner } from './execution/infrastructure/prisma-codex-target.provisioner.js';
import { PrismaService } from './shared/infrastructure/prisma.service.js';
import { resolveCodexTargetInput } from './codex-target-host.js';

const database = new PrismaService();

try {
  const target = await new PrismaCodexTargetProvisioner(database)
    .provision(resolveCodexTargetInput(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(target)}\n`);
} finally {
  await database.$disconnect();
}
