import { spawnSync } from 'node:child_process';
import { arch, hostname, platform } from 'node:os';
import type { CodexTargetInput } from './execution/application/codex-target-provisioner.js';

export interface HostMetadataReader {
  hostname: () => string;
  platform: () => string;
  arch: () => string;
  codexVersion: () => string;
}

const defaultHostMetadataReader: HostMetadataReader = {
  hostname,
  platform,
  arch,
  codexVersion: () => {
    const result = spawnSync('codex', ['--version'], { encoding: 'utf8' });
    const output = result.stdout.trim();
    if (output) return output;
    throw new Error(`Could not run Codex CLI: ${result.error?.message ?? result.stderr.trim()}`);
  },
};

const extractCodexVersion = (output: string): string => {
  const version = output.match(/\d+\.\d+\.\d+(?:[-+][\w.-]+)?/)?.[0];
  if (!version) throw new Error(`Could not determine Codex CLI version from: ${output || '(empty output)'}`);
  return version;
};

export const resolveCodexTargetInput = (
  args: readonly string[],
  reader: HostMetadataReader = defaultHostMetadataReader,
): CodexTargetInput => {
  if (args.length === 0) {
    const host = reader.hostname();
    return {
      nodeName: host,
      hostname: host,
      operatingSystem: reader.platform(),
      architecture: reader.arch(),
      agentVersion: extractCodexVersion(reader.codexVersion()),
    };
  }
  if (args.length !== 5) {
    throw new Error('Usage: target:codex [<name> <hostname> <os> <arch> <codex-version>]');
  }
  const [nodeName, host, operatingSystem, architecture, agentVersion] = args as readonly [
    string, string, string, string, string,
  ];
  return { nodeName, hostname: host, operatingSystem, architecture, agentVersion };
};
