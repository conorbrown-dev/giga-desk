import { Query } from '@nestjs/cqrs';

export interface DiscoverableJob {
  id: string; workItemId: string; workItemTitle: string;
  projectId: string; projectKey: string; requestedAt: string; status: 'Queued';
}

export class DiscoverNodeJobsQuery extends Query<readonly DiscoverableJob[]> {
  constructor(readonly nodeId: string) { super(); }
}
