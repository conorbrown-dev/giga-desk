import { createRequire } from 'node:module';
import { arch, hostname, platform } from 'node:os';
import { resolveCodexRegistration } from './codex-registration.js';

export type SupportedRuntime = 'CodexAppServer' | 'CodexSdk' | 'ClaudeAgentSdk' | 'OpenCode';
const require = createRequire(import.meta.url);

const packageVersion = (name: string): string => {
  const value: unknown = require(`${name}/package.json`);
  if (typeof value !== 'object' || value === null || !('version' in value) || typeof value.version !== 'string') throw new Error(`Could not determine ${name} version`);
  return value.version;
};

export const registrationFor = (runtime: SupportedRuntime) => {
  if (runtime === 'CodexAppServer' || runtime === 'CodexSdk') {
    return { ...resolveCodexRegistration(), agentType: runtime, agentName: runtime === 'CodexAppServer' ? 'Codex App Server' : 'Codex SDK' };
  }
  if (runtime === 'ClaudeAgentSdk') return {
    hostname: hostname(), operatingSystem: platform(), architecture: arch(),
    agentVersion: packageVersion('@anthropic-ai/claude-agent-sdk'), agentType: runtime, agentName: 'Claude Agent SDK',
    modelIdentifier: process.env['GIGA_DESK_WORKER_MODEL_IDENTIFIER']?.trim() || 'claude-sonnet-5',
  };
  throw new Error(`Unsupported Giga Desk agent runtime: ${runtime}`);
};
