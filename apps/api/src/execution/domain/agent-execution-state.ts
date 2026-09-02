import type { WorkItemStatus } from '../../work-management/domain/work-item.js';

export class InvalidAgentExecutionStateError extends Error {}

export const assertCanStartExecution = (
  jobStatus: string, workItemStatus: WorkItemStatus, prerequisites: readonly WorkItemStatus[],
): void => {
  if (jobStatus !== 'Assigned' || workItemStatus !== 'Ready') {
    throw new InvalidAgentExecutionStateError('Execution is not ready to start');
  }
  if (prerequisites.some((status) => status !== 'Completed')) {
    throw new InvalidAgentExecutionStateError('Unfinished prerequisites block work');
  }
};

export const assertCanReportProgress = (status: string): void => {
  if (!['Running', 'WaitingForInput', 'Blocked', 'Testing', 'Reviewing', 'Deploying', 'E2ETesting'].includes(status)) {
    throw new InvalidAgentExecutionStateError('Execution is not accepting progress');
  }
};
