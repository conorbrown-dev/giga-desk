import { Query } from '@nestjs/cqrs';

export interface ExecutionHistoryView {
  id: string; status: string; requestedAt: string; startedAt: string | null; completedAt: string | null;
  failureReason: string | null; branchName: string | null; commitHash: string | null; pullRequestUrl: string | null;
  node: { id: string; name: string }; agent: { id: string; name: string; version: string };
  model: { id: string; displayName: string; provider: string };
  process: { id: number; startedAt: string; terminationRequestedAt: string | null } | null;
  progress: readonly { phase: string; message: string; createdAt: string }[];
  tests: readonly { type: string; result: string; testCount: number | null; createdAt: string }[];
  deployments: readonly { environment: string; status: string; version: string | null; url: string | null; startedAt: string; completedAt: string | null }[];
}
export class ListWorkItemExecutionsQuery extends Query<readonly ExecutionHistoryView[]> {
  constructor(readonly workItemId: string) { super(); }
}
