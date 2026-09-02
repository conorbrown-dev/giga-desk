import { describe, expect, it } from 'vitest';
import { assertCanReportTests } from './agent-test-state.js';

describe('agent test reporting state', () => {
  it('accepts automated tests during implementation testing', () => {
    expect(() => { assertCanReportTests('Running', 'Unit'); }).not.toThrow();
    expect(() => { assertCanReportTests('Testing', 'Integration'); }).not.toThrow();
  });

  it('accepts E2E evidence only after deployment', () => {
    expect(() => { assertCanReportTests('E2ETesting', 'EndToEnd'); }).not.toThrow();
    expect(() => { assertCanReportTests('Testing', 'EndToEnd'); }).toThrow('cannot accept');
  });
});
