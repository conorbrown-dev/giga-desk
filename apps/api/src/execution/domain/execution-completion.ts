import type { ReportedTestOutcome, ReportedTestType } from './agent-test-state.js';

export class ExecutionCompletionRejectedError extends Error {}
export interface CompletionEvidence {
  jobStatus: string;
  acceptanceCriterionIds: readonly string[];
  satisfiedCriterionIds: readonly string[];
  latestTests: Readonly<Partial<Record<ReportedTestType, ReportedTestOutcome>>>;
  deploymentStatus: string | null;
}

export const assertExecutionCanComplete = (evidence: CompletionEvidence): void => {
  if (evidence.jobStatus !== 'E2ETesting') throw new ExecutionCompletionRejectedError('Execution is not awaiting completion');
  if (evidence.latestTests.Unit !== 'Passed' || evidence.latestTests.Integration !== 'Passed'
    || evidence.latestTests.EndToEnd !== 'Passed') {
    throw new ExecutionCompletionRejectedError('Passing Unit, Integration, and E2E tests are required');
  }
  if (evidence.deploymentStatus !== 'Succeeded') {
    throw new ExecutionCompletionRejectedError('A successful deployment is required');
  }
  const satisfied = new Set(evidence.satisfiedCriterionIds);
  if (satisfied.size !== evidence.acceptanceCriterionIds.length
    || evidence.acceptanceCriterionIds.some((id) => !satisfied.has(id))) {
    throw new ExecutionCompletionRejectedError('Every acceptance criterion must be confirmed');
  }
};
