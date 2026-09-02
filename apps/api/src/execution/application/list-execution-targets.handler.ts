import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { ExecutionTargetQueries } from './execution-target-queries.js';
import { ListExecutionTargetsQuery, type ExecutionTargetRegistry } from './list-execution-targets.query.js';

@QueryHandler(ListExecutionTargetsQuery)
export class ListExecutionTargetsHandler implements IQueryHandler<ListExecutionTargetsQuery> {
  constructor(private readonly targets: ExecutionTargetQueries) {}

  execute(): Promise<ExecutionTargetRegistry> {
    return this.targets.listEnabled();
  }
}
