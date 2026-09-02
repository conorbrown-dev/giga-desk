import type { WorkItemStatus } from '../../work-management/domain/work-item.js';

export class InvalidExecutionSelectionError extends Error {}

export interface ExecutionSelection {
  projectId: string;
  workItemStatus: WorkItemStatus;
  prerequisiteStatuses: readonly WorkItemStatus[];
  hasActiveJob: boolean;
  node: {
    enabled: boolean; status: 'Online' | 'Offline' | 'Busy' | 'Degraded' | 'Disabled';
    currentJobCount: number; maximumConcurrentJobs: number;
    supportedAgentTypes: readonly string[]; supportedModelProviders: readonly string[];
  };
  agent: { enabled: boolean; agentType: string; supportedModelProviders: readonly string[] };
  model: { enabled: boolean; provider: string };
}

export const assertExecutionCanBeQueued = (selection: ExecutionSelection): void => {
  if (selection.workItemStatus !== 'Backlog' && selection.workItemStatus !== 'Ready') {
    throw new InvalidExecutionSelectionError('Work item is not available to start');
  }
  if (selection.prerequisiteStatuses.some((status) => status !== 'Completed')) {
    throw new InvalidExecutionSelectionError('Unfinished prerequisites block work');
  }
  if (selection.hasActiveJob) throw new InvalidExecutionSelectionError('Work item already has an active execution');
  if (!selection.node.enabled || !['Online', 'Busy'].includes(selection.node.status)
    || selection.node.currentJobCount >= selection.node.maximumConcurrentJobs) {
    throw new InvalidExecutionSelectionError('Execution node is unavailable');
  }
  if (!selection.agent.enabled || !selection.model.enabled) {
    throw new InvalidExecutionSelectionError('Agent or model is unavailable');
  }
  if (!selection.agent.supportedModelProviders.includes(selection.model.provider)
    || !selection.node.supportedAgentTypes.includes(selection.agent.agentType)
    || !selection.node.supportedModelProviders.includes(selection.model.provider)) {
    throw new InvalidExecutionSelectionError('Node, agent, and model are incompatible');
  }
};
