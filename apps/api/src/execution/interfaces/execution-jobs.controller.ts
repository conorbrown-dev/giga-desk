import { Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { AuthenticatedRequest } from '../../auth/interfaces/authentication.guard.js';
import { RequirePermissions } from '../../auth/interfaces/permissions.decorator.js';
import { CreateExecutionJobCommand, type QueuedExecutionJob } from '../application/create-execution-job.command.js';
import { ConcurrentExecutionRequestError, ExecutionSelectionNotFoundError } from '../application/execution-job-repository.js';
import { InvalidExecutionSelectionError, isProjectRepositoryExecutable } from '../domain/execution-selection.js';
import { repositoryUrls } from '../infrastructure/prisma-execution-job.repository.js';
import { CreateExecutionJobDto } from './create-execution-job.dto.js';
import { ListWorkItemExecutionsQuery, type ExecutionHistoryView } from '../application/list-work-item-executions.query.js';
import { PrismaService } from '../../shared/infrastructure/prisma.service.js';
import { randomUUID } from 'node:crypto';

@Controller('work-items')
export class ExecutionJobsController {
  constructor(private readonly commands: CommandBus, private readonly queries: QueryBus, private readonly database: PrismaService) {}

  @Get(':workItemId/executions')
  @RequirePermissions('work-items:read')
  list(@Param('workItemId', ParseUUIDPipe) workItemId: string): Promise<readonly ExecutionHistoryView[]> {
    return this.queries.execute(new ListWorkItemExecutionsQuery(workItemId));
  }

  @Post(':workItemId/executions')
  @RequirePermissions('executions:create')
  async create(
    @Param('workItemId', ParseUUIDPipe) workItemId: string,
    @Body() input: CreateExecutionJobDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<QueuedExecutionJob> {
    if (!request.user) throw new Error('Authenticated principal was not attached');
    try {
      return await this.commands.execute(new CreateExecutionJobCommand(
        workItemId, input.executionNodeId, input.agentId, input.modelId,
        input.protectedActionsApproved, request.user.subject,
      ));
    } catch (error) {
      if (error instanceof ExecutionSelectionNotFoundError) throw new NotFoundException(error.message);
      if (error instanceof InvalidExecutionSelectionError || error instanceof ConcurrentExecutionRequestError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  @Post(':workItemId/executions/:jobId/clear')
  @RequirePermissions('executions:create')
  async clear(
    @Param('workItemId', ParseUUIDPipe) workItemId: string, @Param('jobId', ParseUUIDPipe) jobId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    if (!request.user) throw new Error('Authenticated principal was not attached');
    const actorId = request.user.subject;
    const cleared = await this.database.$transaction(async (transaction) => {
      const job = await transaction.executionJob.findFirst({ where: { id: jobId, workItemId, status: { in: ['Queued', 'Failed', 'Cancelled'] } }, select: { executionNodeId: true, status: true, workItem: { select: { projectId: true, status: true } } } });
      if (!job) return false;
      if (job.status !== 'Queued') {
        await transaction.deployment.deleteMany({ where: { executionJobId: jobId } });
        const execution = await transaction.executionJob.deleteMany({ where: { id: jobId, workItemId, status: { in: ['Failed', 'Cancelled'] } } });
        if (execution.count !== 1) return false;
        if (job.workItem.status === 'Blocked') {
          await transaction.workItem.update({ where: { id: workItemId }, data: { status: 'Ready' } });
          await transaction.activity.create({ data: { projectId: job.workItem.projectId, workItemId, actorId, eventType: 'WorkItemStatusChanged', metadata: { from: 'Blocked', to: 'Ready', reason: 'Execution history cleared' } } });
        }
        await transaction.activity.create({ data: { projectId: job.workItem.projectId, workItemId, actorId, eventType: 'ExecutionHistoryCleared', metadata: { executionJobId: jobId, previousStatus: job.status } } });
        return true;
      }
      const execution = await transaction.executionJob.deleteMany({ where: { id: jobId, status: 'Queued' } });
      const node = await transaction.executionNode.updateMany({ where: { id: job.executionNodeId, currentJobCount: { gt: 0 } }, data: { currentJobCount: { decrement: 1 } } });
      if (execution.count !== 1 || node.count !== 1) return false;
      await transaction.activity.create({ data: { projectId: job.workItem.projectId, workItemId, actorId, eventType: 'ExecutionCleared', metadata: { executionJobId: jobId, previousStatus: 'Queued' } } });
      return true;
    });
    if (!cleared) throw new ConflictException('Only queued, failed, or cancelled executions can be cleared.');
  }

  @Post(':workItemId/executions/:jobId/retry')
  @RequirePermissions('executions:create')
  async retry(
    @Param('workItemId', ParseUUIDPipe) workItemId: string, @Param('jobId', ParseUUIDPipe) jobId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<QueuedExecutionJob> {
    if (!request.user) throw new Error('Authenticated principal was not attached');
    const actorId = request.user.subject;
    const retried = await this.database.$transaction(async (transaction) => {
      const source = await transaction.executionJob.findFirst({ where: { id: jobId, workItemId, status: { in: ['Failed', 'Cancelled'] } }, select: { executionNodeId: true, agentId: true, modelId: true, protectedActionsApproved: true, executionNode: { select: { maximumConcurrentJobs: true, capabilities: true } }, workItem: { select: { projectId: true, status: true, project: { select: { repositoryUrl: true, defaultBranch: true } } } } } });
      if (!source || !['Blocked', 'Ready', 'Backlog'].includes(source.workItem.status)
        || !isProjectRepositoryExecutable(source.workItem.project.repositoryUrl, source.workItem.project.defaultBranch,
          repositoryUrls(source.executionNode.capabilities))) return null;
      const active = await transaction.executionJob.count({ where: { workItemId, status: { notIn: ['Completed', 'Failed', 'Cancelled'] } } });
      if (active !== 0) return null;
      const node = await transaction.executionNode.updateMany({ where: { id: source.executionNodeId, enabled: true, status: { in: ['Online', 'Busy'] }, currentJobCount: { lt: source.executionNode.maximumConcurrentJobs } }, data: { currentJobCount: { increment: 1 } } });
      if (node.count !== 1) return null;
      await transaction.workItem.update({ where: { id: workItemId }, data: { status: 'Ready' } });
      const job: QueuedExecutionJob = { id: randomUUID(), workItemId, executionNodeId: source.executionNodeId, agentId: source.agentId, modelId: source.modelId, status: 'Queued', protectedActionsApproved: source.protectedActionsApproved };
      await transaction.executionJob.create({ data: { ...job, requestedBy: actorId } });
      await transaction.activity.create({ data: { projectId: source.workItem.projectId, workItemId, actorId, eventType: 'ExecutionRetried', metadata: { executionJobId: job.id, retriedExecutionJobId: jobId } } });
      return job;
    });
    if (!retried) throw new ConflictException('This execution cannot be retried on its previous target.');
    return retried;
  }
}
