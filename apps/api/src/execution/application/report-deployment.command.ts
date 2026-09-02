import { Command } from '@nestjs/cqrs';
import type { ReportedDeploymentStatus } from '../domain/agent-deployment-state.js';

export interface StoredDeployment {
  id: string; environment: 'Development' | 'Test' | 'Staging' | 'Production'; status: ReportedDeploymentStatus;
  version: string | null; commitHash: string | null; url: string | null; failureReason: string | null;
  startedAt: string; completedAt: string | null;
}
export class ReportDeploymentCommand extends Command<StoredDeployment> {
  constructor(readonly jobId: string, readonly nodeId: string, readonly actorId: string,
    readonly input: Omit<StoredDeployment, 'id' | 'startedAt' | 'completedAt'>,
    readonly idempotencyKey: string) { super(); }
}
