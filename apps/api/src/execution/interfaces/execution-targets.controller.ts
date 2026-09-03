import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { PrismaService } from '../../shared/infrastructure/prisma.service.js';
import { RequirePermissions } from '../../auth/interfaces/permissions.decorator.js';
import { RepositoryMappingsDto } from './repository-mappings.dto.js';
import { ListExecutionTargetsQuery, type ExecutionTargetRegistry } from '../application/list-execution-targets.query.js';

@Controller('execution/targets')
export class ExecutionTargetsController {
  constructor(private readonly queries: QueryBus, private readonly database: PrismaService) {}

  @Get()
  @RequirePermissions('executions:read')
  list(): Promise<ExecutionTargetRegistry> {
    return this.queries.execute(new ListExecutionTargetsQuery());
  }

  @Put(':nodeId/repositories')
  @RequirePermissions('executions:create')
  async updateRepositories(@Param('nodeId', ParseUUIDPipe) nodeId: string, @Body() input: RepositoryMappingsDto) {
    const node = await this.database.executionNode.findUnique({ where: { id: nodeId }, select: { capabilities: true } });
    if (!node) throw new NotFoundException('Execution node not found');
    const capabilities = node.capabilities && typeof node.capabilities === 'object' && !Array.isArray(node.capabilities)
      ? node.capabilities as Record<string, unknown> : {};
    const mappings = input.mappings.map(({ url, path }) => ({ url: url.trim(), path: path.trim() }));
    return this.database.executionNode.update({ where: { id: nodeId }, data: { capabilities: { ...capabilities, repositoryMappings: mappings } }, select: { id: true, capabilities: true } });
  }
}
