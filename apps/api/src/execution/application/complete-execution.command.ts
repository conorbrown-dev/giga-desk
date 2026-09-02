import { Command } from '@nestjs/cqrs';

export interface CompletedExecution { id: string; status: 'Completed'; completedAt: string }
export interface CompletionInput {
  summary: string; satisfiedAcceptanceCriterionIds: readonly string[];
  branchName: string | null; commitHash: string | null; pullRequestUrl: string | null; idempotencyKey: string;
}
export class CompleteExecutionCommand extends Command<CompletedExecution> {
  constructor(readonly jobId: string, readonly nodeId: string, readonly actorId: string,
    readonly input: CompletionInput) { super(); }
}
