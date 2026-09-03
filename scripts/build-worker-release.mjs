import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const releaseDirectory = resolve('apps/web/public/releases');
const archivePath = join(releaseDirectory, 'giga-desk-worker.tgz');
const stagingDirectory = mkdtempSync(join(tmpdir(), 'giga-desk-worker-'));

try {
  mkdirSync(join(stagingDirectory, 'apps/codex-worker'), { recursive: true });
  mkdirSync(join(stagingDirectory, 'node_modules/@giga-desk/agent-client'), { recursive: true });
  cpSync('apps/codex-worker/dist', join(stagingDirectory, 'apps/codex-worker/dist'), { recursive: true });
  cpSync('apps/agent-client/dist', join(stagingDirectory, 'node_modules/@giga-desk/agent-client/dist'), { recursive: true });
  cpSync('apps/agent-client/package.json', join(stagingDirectory, 'node_modules/@giga-desk/agent-client/package.json'));
  writeFileSync(join(stagingDirectory, 'package.json'), JSON.stringify({
    name: '@giga-desk/worker-release', private: true, version: '1.0.0',
    engines: { node: '>=22' }, scripts: { start: 'node apps/codex-worker/dist/main.js' },
  }, null, 2));
  mkdirSync(releaseDirectory, { recursive: true });
  execFileSync('tar', ['-czf', archivePath, '-C', stagingDirectory, '.']);
  const checksum = createHash('sha256').update(readFileSync(archivePath)).digest('hex');
  writeFileSync(`${archivePath}.sha256`, `${checksum}  giga-desk-worker.tgz\n`);
} finally {
  rmSync(stagingDirectory, { recursive: true, force: true });
}
