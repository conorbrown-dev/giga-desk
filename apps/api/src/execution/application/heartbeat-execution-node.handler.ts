import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { ExecutionNodeHeartbeatRepository } from './execution-node-heartbeat-repository.js';
import {
  HeartbeatExecutionNodeCommand,
  type HeartbeatingExecutionNode,
} from './heartbeat-execution-node.command.js';

@CommandHandler(HeartbeatExecutionNodeCommand)
export class HeartbeatExecutionNodeHandler implements ICommandHandler<HeartbeatExecutionNodeCommand> {
  constructor(private readonly nodes: ExecutionNodeHeartbeatRepository) {}

  execute(command: HeartbeatExecutionNodeCommand): Promise<HeartbeatingExecutionNode> {
    return this.nodes.heartbeat(command.nodeId);
  }
}
