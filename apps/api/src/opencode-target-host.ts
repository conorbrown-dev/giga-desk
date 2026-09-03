import { spawnSync } from 'node:child_process';
import { arch, hostname, platform } from 'node:os';
import type { OpenCodeTargetInput } from './execution/application/opencode-target-provisioner.js';

export interface OpenCodeHostMetadataReader {
  hostname: () => string;
  platform: () => string;
  arch: () => string;
  openCodeVersion: () => string;
}

const defaultReader: OpenCodeHostMetadataReader = {
  hostname,
  platform,
  arch,
  openCodeVersion: () => {
    const result = spawnSync('opencode', ['--version'], { encoding: 'utf8' });
    const output = result.stdout.trim();
    if (output) return output;
    throw new Error(`Could not run OpenCode CLI: ${result.error?.message ?? result.stderr.trim()}`);
  },
};

const extractVersion = (output: string): string => {
  const version = output.match(/\d+\.\d+\.\d+(?:[-+][\w.-]+)?/)?.[0];
  if (!version) throw new Error(`Could not determine OpenCode CLI version from: ${output || '(empty output)'}`);
  return version;
};

export const resolveOpenCodeTargetInput = (
  args: readonly string[],
  reader: OpenCodeHostMetadataReader = defaultReader,
): OpenCodeTargetInput => {
  if (args.length !== 2) throw new Error('Usage: target:opencode <agent-name> <provider/model>');
  const [agentName, modelIdentifier] = args as readonly [string, string];
  const host = reader.hostname();
  return {
    nodeName: host,
    agentName,
    hostname: host,
    operatingSystem: reader.platform(),
    architecture: reader.arch(),
    agentVersion: extractVersion(reader.openCodeVersion()),
    modelIdentifier,
  };
};
