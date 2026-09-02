import { describe, expect, it } from 'vitest';
import { ExecutionTargetQueries } from './execution-target-queries.js';
import { ListExecutionTargetsHandler } from './list-execution-targets.handler.js';
import type { ExecutionTargetRegistry } from './list-execution-targets.query.js';

const registry: ExecutionTargetRegistry = { nodes: [], agents: [], models: [] };

class StubExecutionTargetQueries extends ExecutionTargetQueries {
  listEnabled(): Promise<ExecutionTargetRegistry> {
    return Promise.resolve(registry);
  }
}

describe('ListExecutionTargetsHandler', () => {
  it('returns the execution registry read model', async () => {
    await expect(new ListExecutionTargetsHandler(new StubExecutionTargetQueries()).execute()).resolves.toBe(registry);
  });
});
