import { describe, expect, it } from 'vitest';
import { assertCanReportDeployment } from './agent-deployment-state.js';

describe('agent deployment state', () => {
  it('requires Testing state with passed Unit and Integration evidence', () => {
    expect(() => { assertCanReportDeployment('Testing', { Unit: 'Passed', Integration: 'Passed' }); }).not.toThrow();
    expect(() => { assertCanReportDeployment('Running', { Unit: 'Passed', Integration: 'Passed' }); }).toThrow('not ready');
    expect(() => { assertCanReportDeployment('Testing', { Unit: 'Passed' }); }).toThrow('required');
    expect(() => { assertCanReportDeployment('Testing', { Unit: 'Failed', Integration: 'Passed' }); }).toThrow('required');
  });
});
