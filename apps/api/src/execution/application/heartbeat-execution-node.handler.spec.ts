import { describe, expect, it } from 'vitest';
import { ExecutionNodeHeartbeatRepository } from './execution-node-heartbeat-repository.js';
import { HeartbeatExecutionNodeCommand, type HeartbeatingExecutionNode } from './heartbeat-execution-node.command.js';
import { HeartbeatExecutionNodeHandler } from './heartbeat-execution-node.handler.js';

class RecordingHeartbeatRepository extends ExecutionNodeHeartbeatRepository {
  nodeId?: string;

  heartbeat(nodeId: string): Promise<HeartbeatingExecutionNode> {
    this.nodeId = nodeId;
    return Promise.resolve({ id: nodeId, status: 'Online', lastHeartbeatAt: '2026-09-02T12:00:00.000Z' });
  }
}

describe('HeartbeatExecutionNodeHandler', () => {
  it('records liveness for the authenticated execution node', async () => {
    const repository = new RecordingHeartbeatRepository();
    const result = await new HeartbeatExecutionNodeHandler(repository)
      .execute(new HeartbeatExecutionNodeCommand('node-1'));

    expect(repository.nodeId).toBe('node-1');
    expect(result).toMatchObject({ id: 'node-1', status: 'Online' });
  });
});
