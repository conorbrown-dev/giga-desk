import { Query } from '@nestjs/cqrs';

export type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export interface ExecutionTargetRegistry {
  nodes: readonly {
    id: string; name: string; status: 'Online' | 'Offline' | 'Busy' | 'Degraded';
    lastHeartbeatAt: string | null; maximumConcurrentJobs: number; currentJobCount: number;
    capabilities: JsonValue; tags: readonly string[];
  }[];
  agents: readonly {
    id: string; name: string; agentType: string; version: string;
    supportedCapabilities: JsonValue; supportedModelProviders: readonly string[];
  }[];
  models: readonly {
    id: string; displayName: string; provider: string; modelIdentifier: string; modelType: string;
    contextWindow: number | null; location: 'Local' | 'Remote'; capabilities: JsonValue;
  }[];
}

export class ListExecutionTargetsQuery extends Query<ExecutionTargetRegistry> {}
