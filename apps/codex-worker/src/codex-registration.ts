import type { CodexRegistration } from '@giga-desk/agent-client/agent-api';
import { spawnSync } from 'node:child_process';
import { arch, hostname, platform } from 'node:os';

export interface CodexRegistrationReader {
  hostname(): string; platform(): string; arch(): string; version(): string;
}

const reader: CodexRegistrationReader = {
  hostname, platform, arch,
  version: () => {
    const result = spawnSync('codex', ['--version'], { encoding: 'utf8' });
    if (result.error || result.status !== 0) throw new Error(`Could not run Codex: ${result.error?.message ?? result.stderr.trim()}`);
    return result.stdout;
  },
};

export const resolveCodexRegistration = (host: CodexRegistrationReader = reader): CodexRegistration => {
  const versionOutput = host.version().trim();
  const agentVersion = versionOutput.match(/\d+\.\d+\.\d+(?:[-+][\w.-]+)?/)?.[0];
  if (!agentVersion) throw new Error(`Could not determine Codex version from: ${versionOutput || '(empty output)'}`);
  return { hostname: host.hostname(), operatingSystem: host.platform(), architecture: host.arch(), agentVersion };
};
