import type { HeartbeatingExecutionNode } from './heartbeat-execution-node.command.js';

export class ExecutionNodeHeartbeatRejectedError extends Error {}

export abstract class ExecutionNodeHeartbeatRepository {
  abstract heartbeat(nodeId: string): Promise<HeartbeatingExecutionNode>;
}
