import type { ReportedTestOutcome, ReportedTestType } from './agent-test-state.js';

export type ReportedDeploymentStatus = 'Pending' | 'Running' | 'Succeeded' | 'Failed' | 'RolledBack';
export class InvalidAgentDeploymentStateError extends Error {}

export const assertCanReportDeployment = (
  jobStatus: string, latestTests: Readonly<Partial<Record<ReportedTestType, ReportedTestOutcome>>>,
): void => {
  if (jobStatus !== 'Testing' && jobStatus !== 'Deploying') {
    throw new InvalidAgentDeploymentStateError('Execution is not ready for deployment');
  }
  if (latestTests.Unit !== 'Passed' || latestTests.Integration !== 'Passed') {
    throw new InvalidAgentDeploymentStateError('Passing Unit and Integration tests are required');
  }
};
