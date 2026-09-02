import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma.service.js';
import {
  ExecutionNodeHeartbeatRejectedError,
  ExecutionNodeHeartbeatRepository,
} from '../application/execution-node-heartbeat-repository.js';
import type { HeartbeatingExecutionNode } from '../application/heartbeat-execution-node.command.js';

@Injectable()
export class PrismaExecutionNodeHeartbeatRepository extends ExecutionNodeHeartbeatRepository {
  constructor(private readonly database: PrismaService) { super(); }

  async heartbeat(nodeId: string): Promise<HeartbeatingExecutionNode> {
    const node = await this.database.executionNode.findFirst({
      where: { id: nodeId, enabled: true },
      select: { currentJobCount: true },
    });
    if (!node) throw new ExecutionNodeHeartbeatRejectedError('Enabled execution node not found');

    const lastHeartbeatAt = new Date();
    const status = node.currentJobCount > 0 ? 'Busy' : 'Online';
    await this.database.executionNode.update({
      where: { id: nodeId },
      data: { lastHeartbeatAt, status },
    });
    return { id: nodeId, status, lastHeartbeatAt: lastHeartbeatAt.toISOString() };
  }
}
