import type { OpenCodeRegistration } from '@giga-desk/agent-client/agent-api';
import { spawnSync } from 'node:child_process';
import { arch, hostname, platform } from 'node:os';

export interface OpenCodeRegistrationReader {
  hostname(): string; platform(): string; arch(): string; version(): string;
}

const reader: OpenCodeRegistrationReader = {
  hostname, platform, arch,
  version: () => {
    const result = spawnSync('opencode', ['--version'], { encoding: 'utf8' });
    if (result.error || result.status !== 0) throw new Error(`Could not run OpenCode: ${result.error?.message ?? result.stderr.trim()}`);
    return result.stdout;
  },
};

export const resolveOpenCodeRegistration = (
  environment: NodeJS.ProcessEnv = process.env,
  host: OpenCodeRegistrationReader = reader,
): OpenCodeRegistration => {
  const versionOutput = host.version().trim();
  const agentVersion = versionOutput.match(/\d+\.\d+\.\d+(?:[-+][\w.-]+)?/)?.[0];
  if (!agentVersion) throw new Error(`Could not determine OpenCode version from: ${versionOutput || '(empty output)'}`);
  return {
    agentName: environment['GIGA_DESK_WORKER_AGENT_NAME']?.trim() || 'MIRIAM',
    modelIdentifier: environment['GIGA_DESK_WORKER_MODEL_IDENTIFIER']?.trim() || 'ollama/qwen3-coder-next:q4_K_M',
    hostname: host.hostname(), operatingSystem: host.platform(), architecture: host.arch(), agentVersion,
  };
};
