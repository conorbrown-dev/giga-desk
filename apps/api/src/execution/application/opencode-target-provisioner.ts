export interface OpenCodeTargetInput {
  nodeName: string; agentName: string; hostname: string; operatingSystem: string; architecture: string; agentVersion: string; modelIdentifier: string;
}

export interface ProvisionedOpenCodeTarget { executionNodeId: string; agentId: string; modelId: string }

export abstract class OpenCodeTargetProvisioner {
  abstract provision(input: OpenCodeTargetInput): Promise<ProvisionedOpenCodeTarget>;
}

export const validateOpenCodeTargetInput = (input: OpenCodeTargetInput): void => {
  const required: readonly [string, string][] = [
    ['nodeName', input.nodeName], ['agentName', input.agentName], ['hostname', input.hostname],
    ['operatingSystem', input.operatingSystem], ['architecture', input.architecture],
    ['agentVersion', input.agentVersion], ['modelIdentifier', input.modelIdentifier],
  ];
  for (const [name, value] of required) if (!value.trim()) throw new Error(`${name} is required`);
};
