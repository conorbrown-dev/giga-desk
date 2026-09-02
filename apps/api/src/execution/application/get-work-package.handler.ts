import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { AgentWorkPackageQueries } from './agent-work-package-queries.js';
import { GetWorkPackageQuery, type WorkPackage } from './get-work-package.query.js';

@QueryHandler(GetWorkPackageQuery)
export class GetWorkPackageHandler implements IQueryHandler<GetWorkPackageQuery> {
  constructor(private readonly workPackages: AgentWorkPackageQueries) {}
  execute(query: GetWorkPackageQuery): Promise<WorkPackage> {
    return this.workPackages.get(query.jobId, query.nodeId);
  }
}
