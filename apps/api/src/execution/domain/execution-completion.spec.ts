import { describe, expect, it } from 'vitest';
import { assertExecutionCanComplete, ExecutionCompletionRejectedError, type CompletionEvidence } from './execution-completion.js';

const completeEvidence = {
  jobStatus: 'E2ETesting', acceptanceCriterionIds: ['criterion-1'], satisfiedCriterionIds: ['criterion-1'],
  latestTests: { Unit: 'Passed' as const, Integration: 'Passed' as const, EndToEnd: 'Passed' as const },
  deploymentStatus: 'Succeeded',
};
const expectRejected = (evidence: CompletionEvidence): void => {
  expect(() => { assertExecutionCanComplete(evidence); }).toThrow(ExecutionCompletionRejectedError);
};

describe('execution completion invariant', () => {
  it('accepts complete evidence', () => { expect(() => { assertExecutionCanComplete(completeEvidence); }).not.toThrow(); });
  it('requires all test and deployment gates', () => {
    for (const evidence of [
      { ...completeEvidence, jobStatus: 'Testing' },
      { ...completeEvidence, latestTests: { ...completeEvidence.latestTests, EndToEnd: 'Failed' as const } },
      { ...completeEvidence, deploymentStatus: null },
    ]) { expectRejected(evidence); }
  });
  it('requires the exact acceptance criterion set', () => {
    expect(() => { assertExecutionCanComplete({ ...completeEvidence, satisfiedCriterionIds: [] }); }).toThrow('Every acceptance');
    expect(() => { assertExecutionCanComplete({ ...completeEvidence, satisfiedCriterionIds: ['criterion-1', 'extra'] }); }).toThrow('Every acceptance');
  });
});
