export class InvalidAgentTestStateError extends Error {}
export type ReportedTestType = 'Unit' | 'Integration' | 'EndToEnd';
export type ReportedTestOutcome = 'Passed' | 'Failed';

export const assertCanReportTests = (jobStatus: string, type: ReportedTestType): void => {
  const valid = type === 'EndToEnd'
    ? jobStatus === 'E2ETesting'
    : jobStatus === 'Running' || jobStatus === 'Testing';
  if (!valid) throw new InvalidAgentTestStateError(`Execution cannot accept ${type} results in ${jobStatus}`);
};
