import { PrismaService } from './shared/infrastructure/prisma.service.js';
import { PrismaOpenCodeTargetProvisioner } from './execution/infrastructure/prisma-opencode-target.provisioner.js';
import { resolveOpenCodeTargetInput } from './opencode-target-host.js';

const database = new PrismaService();
try {
  const target = await new PrismaOpenCodeTargetProvisioner(database).provision(
    resolveOpenCodeTargetInput(process.argv.slice(2)),
  );
  process.stdout.write(`${JSON.stringify(target)}\n`);
} finally { await database.$disconnect(); }
