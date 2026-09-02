import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { AgentJobRepository } from './agent-job-repository.js';
import { DiscoverNodeJobsQuery, type DiscoverableJob } from './discover-node-jobs.query.js';

@QueryHandler(DiscoverNodeJobsQuery)
export class DiscoverNodeJobsHandler implements IQueryHandler<DiscoverNodeJobsQuery> {
  constructor(private readonly jobs: AgentJobRepository) {}
  execute(query: DiscoverNodeJobsQuery): Promise<readonly DiscoverableJob[]> {
    return this.jobs.discover(query.nodeId);
  }
}
