import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { RequirePermissions } from '../../auth/interfaces/permissions.decorator.js';
import { ListExecutionTargetsQuery, type ExecutionTargetRegistry } from '../application/list-execution-targets.query.js';

@Controller('execution/targets')
export class ExecutionTargetsController {
  constructor(private readonly queries: QueryBus) {}

  @Get()
  @RequirePermissions('executions:read')
  list(): Promise<ExecutionTargetRegistry> {
    return this.queries.execute(new ListExecutionTargetsQuery());
  }
}
