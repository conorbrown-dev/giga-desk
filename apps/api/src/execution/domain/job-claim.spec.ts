import { describe, expect, it } from 'vitest';
import { assertWorkerNode } from './job-claim.js';

describe('worker node scope', () => {
  it('accepts only the node carried by the authenticated machine identity', () => {
    expect(() => { assertWorkerNode('node-1', 'node-1'); }).not.toThrow();
    expect(() => { assertWorkerNode('node-1', 'node-2'); }).toThrow('does not match');
    expect(() => { assertWorkerNode('node-1', null); }).toThrow('does not match');
  });
});
