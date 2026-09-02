export interface CodexTargetInput {
  nodeName: string;
  hostname: string;
  operatingSystem: string;
  architecture: string;
  agentVersion: string;
}

export interface ProvisionedCodexTarget {
  executionNodeId: string;
  agentId: string;
  modelId: string;
}

export abstract class CodexTargetProvisioner {
  abstract provision(input: CodexTargetInput): Promise<ProvisionedCodexTarget>;
}

export const validateCodexTargetInput = (input: CodexTargetInput): void => {
  const required = [
    ['nodeName', input.nodeName], ['hostname', input.hostname], ['operatingSystem', input.operatingSystem],
    ['architecture', input.architecture], ['agentVersion', input.agentVersion],
  ] as const;
  for (const [name, value] of required) {
    if (!value.trim()) throw new Error(`${name} is required`);
  }
};
