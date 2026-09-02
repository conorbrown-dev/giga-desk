import { Command } from '@nestjs/cqrs';

export interface HeartbeatingExecutionNode {
  id: string;
  status: 'Online' | 'Busy';
  lastHeartbeatAt: string;
}

export class HeartbeatExecutionNodeCommand extends Command<HeartbeatingExecutionNode> {
  constructor(readonly nodeId: string) { super(); }
}
