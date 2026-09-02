import { describe, expect, it } from 'vitest';
import { assertCanReportProgress, assertCanStartExecution } from './agent-execution-state.js';

describe('agent execution state', () => {
  it('starts only an assigned job with ready unblocked work', () => {
    expect(() => { assertCanStartExecution('Assigned', 'Ready', ['Completed']); }).not.toThrow();
    expect(() => { assertCanStartExecution('Running', 'Ready', []); }).toThrow('not ready');
    expect(() => { assertCanStartExecution('Assigned', 'Ready', ['Testing']); }).toThrow('prerequisites');
  });

  it('accepts progress only while execution is active', () => {
    expect(() => { assertCanReportProgress('Running'); }).not.toThrow();
    expect(() => { assertCanReportProgress('Assigned'); }).toThrow('not accepting');
  });
});
