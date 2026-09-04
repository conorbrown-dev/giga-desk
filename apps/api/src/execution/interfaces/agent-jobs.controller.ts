import { Body, ConflictException, Controller, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { AuthenticatedRequest } from '../../auth/interfaces/authentication.guard.js';
import { RequirePermissions } from '../../auth/interfaces/permissions.decorator.js';
import { ClaimExecutionJobCommand, type ClaimedExecutionJob } from '../application/claim-execution-job.command.js';
import { DiscoverNodeJobsQuery, type DiscoverableJob } from '../application/discover-node-jobs.query.js';
import { WorkPackageNotFoundError } from '../application/agent-work-package-queries.js';
import { GetWorkPackageQuery, type WorkPackage } from '../application/get-work-package.query.js';
import { AgentExecutionNotFoundError } from '../application/agent-execution-repository.js';
import { ReportProgressCommand, type ReportedProgress } from '../application/report-progress.command.js';
import { StartExecutionCommand, type StartedExecution } from '../application/start-execution.command.js';
import { ReportTestResultCommand, type StoredTestResult } from '../application/report-test-result.command.js';
import { ReportDeploymentCommand, type StoredDeployment } from '../application/report-deployment.command.js';
import { CompleteExecutionCommand, type CompletedExecution } from '../application/complete-execution.command.js';
import { ConcurrentExecutionCompletionError } from '../application/agent-completion-repository.js';
import { InvalidAgentExecutionStateError } from '../domain/agent-execution-state.js';
import { InvalidAgentTestStateError } from '../domain/agent-test-state.js';
import { InvalidAgentDeploymentStateError } from '../domain/agent-deployment-state.js';
import { assertWorkerNode, JobClaimConflictError, WorkerNodeMismatchError } from '../domain/job-claim.js';
import { ReportProgressDto } from './report-progress.dto.js';
import { ReportTestResultDto } from './report-test-result.dto.js';
import { ReportDeploymentDto } from './report-deployment.dto.js';
import { CompleteExecutionDto } from './complete-execution.dto.js';
import { ExecutionCompletionRejectedError } from '../domain/execution-completion.js';
import { ReportExecutionFailureCommand, type FailedExecution } from '../application/report-execution-failure.command.js';
import { ExecutionFailureRejectedError } from '../application/agent-failure-repository.js';
import { ReportExecutionFailureDto } from './report-execution-failure.dto.js';
import { HeartbeatExecutionNodeCommand, type HeartbeatingExecutionNode } from '../application/heartbeat-execution-node.command.js';
import { ExecutionNodeHeartbeatRejectedError } from '../application/execution-node-heartbeat-repository.js';
import { RegisterOpenCodeTargetCommand } from '../application/register-opencode-target.command.js';
import type { ProvisionedOpenCodeTarget } from '../application/opencode-target-provisioner.js';
import { RegisterOpenCodeTargetDto } from './register-opencode-target.dto.js';
import { RegisterCodexTargetCommand } from '../application/register-codex-target.command.js';
import type { ProvisionedCodexTarget } from '../application/codex-target-provisioner.js';
import { RegisterCodexTargetDto } from './register-codex-target.dto.js';
import { PrismaService } from '../../shared/infrastructure/prisma.service.js';
import { ReportProcessDto } from './report-process.dto.js';

@Controller('agent')
export class AgentJobsController {
  constructor(private readonly commands: CommandBus, private readonly queries: QueryBus, private readonly database: PrismaService) {}

  @Get('nodes/:nodeId/repositories')
  @RequirePermissions('agent:jobs')
  async repositories(@Param('nodeId', ParseUUIDPipe) nodeId: string, @Req() request: AuthenticatedRequest) {
    try {
      assertWorkerNode(nodeId, request.user?.executionNodeId ?? null);
      const node = await this.database.executionNode.findUnique({ where: { id: nodeId }, select: { capabilities: true } });
      const capabilities = node?.capabilities && typeof node.capabilities === 'object' && !Array.isArray(node.capabilities)
        ? node.capabilities as Record<string, unknown> : {};
      const mappings = Array.isArray(capabilities['repositoryMappings']) ? capabilities['repositoryMappings'] : [];
      return { mappings };
    } catch (error) {
      if (error instanceof WorkerNodeMismatchError) throw new ForbiddenException(error.message);
      throw error;
    }
  }

  @Post('nodes/:nodeId/codex-registration')
  @RequirePermissions('agent:jobs')
  registerCodex(
    @Param('nodeId', ParseUUIDPipe) nodeId: string, @Body() input: RegisterCodexTargetDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProvisionedCodexTarget> {
    try {
      assertWorkerNode(nodeId, request.user?.executionNodeId ?? null);
      return this.commands.execute(new RegisterCodexTargetCommand(nodeId, input));
    } catch (error) {
      if (error instanceof WorkerNodeMismatchError) throw new ForbiddenException(error.message);
      throw error;
    }
  }

  @Post('nodes/:nodeId/opencode-registration')
  @RequirePermissions('agent:jobs')
  registerOpenCode(
    @Param('nodeId', ParseUUIDPipe) nodeId: string, @Body() input: RegisterOpenCodeTargetDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ProvisionedOpenCodeTarget> {
    try {
      assertWorkerNode(nodeId, request.user?.executionNodeId ?? null);
      return this.commands.execute(new RegisterOpenCodeTargetCommand(nodeId, input));
    } catch (error) {
      if (error instanceof WorkerNodeMismatchError) throw new ForbiddenException(error.message);
      throw error;
    }
  }

  @Post('nodes/:nodeId/heartbeat')
  @RequirePermissions('agent:jobs')
  async heartbeat(
    @Param('nodeId', ParseUUIDPipe) nodeId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<HeartbeatingExecutionNode> {
    try {
      assertWorkerNode(nodeId, request.user?.executionNodeId ?? null);
      return await this.commands.execute(new HeartbeatExecutionNodeCommand(nodeId));
    } catch (error) {
      if (error instanceof WorkerNodeMismatchError) throw new ForbiddenException(error.message);
      if (error instanceof ExecutionNodeHeartbeatRejectedError) throw new NotFoundException(error.message);
      throw error;
    }
  }

  @Get('nodes/:nodeId/jobs')
  @RequirePermissions('agent:jobs')
  discover(@Param('nodeId', ParseUUIDPipe) nodeId: string, @Req() request: AuthenticatedRequest): Promise<readonly DiscoverableJob[]> {
    try {
      assertWorkerNode(nodeId, request.user?.executionNodeId ?? null);
      return this.queries.execute(new DiscoverNodeJobsQuery(nodeId));
    } catch (error) {
      if (error instanceof WorkerNodeMismatchError) throw new ForbiddenException(error.message);
      throw error;
    }
  }

  @Post('jobs/:jobId/claim')
  @RequirePermissions('agent:jobs')
  async claim(@Param('jobId', ParseUUIDPipe) jobId: string, @Req() request: AuthenticatedRequest): Promise<ClaimedExecutionJob> {
    const nodeId = request.user?.executionNodeId;
    if (!nodeId || !request.user) throw new ForbiddenException('Worker identity requires an execution node');
    try {
      return await this.commands.execute(new ClaimExecutionJobCommand(jobId, nodeId, request.user.subject));
    } catch (error) {
      if (error instanceof JobClaimConflictError) throw new ConflictException(error.message);
      throw error;
    }
  }

  @Get('jobs/:jobId/work-package')
  @RequirePermissions('agent:jobs')
  async getWorkPackage(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<WorkPackage> {
    const nodeId = request.user?.executionNodeId;
    if (!nodeId) throw new ForbiddenException('Worker identity requires an execution node');
    try {
      return await this.queries.execute(new GetWorkPackageQuery(jobId, nodeId));
    } catch (error) {
      if (error instanceof WorkPackageNotFoundError) throw new NotFoundException(error.message);
      throw error;
    }
  }

  @Post('jobs/:jobId/start')
  @RequirePermissions('agent:jobs')
  async start(@Param('jobId', ParseUUIDPipe) jobId: string, @Req() request: AuthenticatedRequest): Promise<StartedExecution> {
    const principal = request.user;
    if (!principal?.executionNodeId) throw new ForbiddenException('Worker identity requires an execution node');
    try {
      return await this.commands.execute(new StartExecutionCommand(jobId, principal.executionNodeId, principal.subject));
    } catch (error) {
      if (error instanceof AgentExecutionNotFoundError) throw new NotFoundException(error.message);
      if (error instanceof InvalidAgentExecutionStateError) throw new ConflictException(error.message);
      throw error;
    }
  }

  @Post('jobs/:jobId/progress')
  @RequirePermissions('agent:jobs')
  async reportProgress(
    @Param('jobId', ParseUUIDPipe) jobId: string, @Body() input: ReportProgressDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<ReportedProgress> {
    const principal = request.user;
    if (!principal?.executionNodeId) throw new ForbiddenException('Worker identity requires an execution node');
    try {
      return await this.commands.execute(new ReportProgressCommand(
        jobId, principal.executionNodeId, principal.subject, input.phase, input.message, input.idempotencyKey,
      ));
    } catch (error) {
      if (error instanceof AgentExecutionNotFoundError) throw new NotFoundException(error.message);
      if (error instanceof InvalidAgentExecutionStateError) throw new ConflictException(error.message);
      throw error;
    }
  }

  @Post('jobs/:jobId/process')
  @RequirePermissions('agent:jobs')
  async reportProcess(
    @Param('jobId', ParseUUIDPipe) jobId: string, @Body() input: ReportProcessDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const nodeId = request.user?.executionNodeId;
    if (!nodeId) throw new ForbiddenException('Worker identity requires an execution node');
    const startedAt = new Date();
    const registered = await this.database.executionJob.updateMany({ where: {
      id: jobId, executionNodeId: nodeId, status: 'Running', processId: null,
    }, data: { processId: input.processId, processStartedAt: startedAt } });
    if (registered.count === 1) return { processId: input.processId, startedAt: startedAt.toISOString() };
    const existing = await this.database.executionJob.findFirst({ where: { id: jobId, executionNodeId: nodeId },
      select: { processId: true, processStartedAt: true } });
    if (!existing) throw new NotFoundException('Execution job not found for this node');
    if (existing.processId === input.processId && existing.processStartedAt) return {
      processId: existing.processId, startedAt: existing.processStartedAt.toISOString(),
    };
    throw new ConflictException('Execution cannot register this process');
  }

  @Get('jobs/:jobId/control')
  @RequirePermissions('agent:jobs')
  async control(@Param('jobId', ParseUUIDPipe) jobId: string, @Req() request: AuthenticatedRequest) {
    const nodeId = request.user?.executionNodeId;
    if (!nodeId) throw new ForbiddenException('Worker identity requires an execution node');
    const job = await this.database.executionJob.findFirst({ where: { id: jobId, executionNodeId: nodeId },
      select: { terminationRequestedAt: true } });
    if (!job) throw new NotFoundException('Execution job not found for this node');
    return { terminationRequested: job.terminationRequestedAt !== null };
  }

  @Post('jobs/:jobId/tests')
  @RequirePermissions('agent:jobs')
  async reportTests(
    @Param('jobId', ParseUUIDPipe) jobId: string, @Body() input: ReportTestResultDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<StoredTestResult> {
    const principal = request.user;
    if (!principal?.executionNodeId) throw new ForbiddenException('Worker identity requires an execution node');
    try {
      return await this.commands.execute(new ReportTestResultCommand(
        jobId, principal.executionNodeId, principal.subject,
        { type: input.type, result: input.result, testCount: input.testCount ?? null,
          failedTests: input.failedTests, durationMs: input.durationMs ?? null, artifactUrl: input.artifactUrl ?? null },
        input.idempotencyKey,
      ));
    } catch (error) {
      if (error instanceof AgentExecutionNotFoundError) throw new NotFoundException(error.message);
      if (error instanceof InvalidAgentTestStateError) throw new ConflictException(error.message);
      throw error;
    }
  }

  @Post('jobs/:jobId/deployment')
  @RequirePermissions('agent:jobs')
  async reportDeployment(
    @Param('jobId', ParseUUIDPipe) jobId: string, @Body() input: ReportDeploymentDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<StoredDeployment> {
    const principal = request.user;
    if (!principal?.executionNodeId) throw new ForbiddenException('Worker identity requires an execution node');
    try {
      return await this.commands.execute(new ReportDeploymentCommand(
        jobId, principal.executionNodeId, principal.subject,
        { environment: input.environment, status: input.status, version: input.version ?? null,
          commitHash: input.commitHash ?? null, url: input.url ?? null, failureReason: input.failureReason ?? null },
        input.idempotencyKey,
      ));
    } catch (error) {
      if (error instanceof AgentExecutionNotFoundError) throw new NotFoundException(error.message);
      if (error instanceof InvalidAgentDeploymentStateError) throw new ConflictException(error.message);
      throw error;
    }
  }

  @Post('jobs/:jobId/complete')
  @RequirePermissions('agent:jobs')
  async complete(
    @Param('jobId', ParseUUIDPipe) jobId: string, @Body() input: CompleteExecutionDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<CompletedExecution> {
    const principal = request.user;
    if (!principal?.executionNodeId) throw new ForbiddenException('Worker identity requires an execution node');
    try {
      return await this.commands.execute(new CompleteExecutionCommand(jobId, principal.executionNodeId, principal.subject, {
        summary: input.summary, satisfiedAcceptanceCriterionIds: input.satisfiedAcceptanceCriterionIds,
        branchName: input.branchName ?? null, commitHash: input.commitHash ?? null,
        pullRequestUrl: input.pullRequestUrl ?? null, idempotencyKey: input.idempotencyKey,
      }));
    } catch (error) {
      if (error instanceof AgentExecutionNotFoundError) throw new NotFoundException(error.message);
      if (error instanceof ExecutionCompletionRejectedError || error instanceof ConcurrentExecutionCompletionError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  @Post('jobs/:jobId/fail')
  @RequirePermissions('agent:jobs')
  async fail(
    @Param('jobId', ParseUUIDPipe) jobId: string, @Body() input: ReportExecutionFailureDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<FailedExecution> {
    const principal = request.user;
    if (!principal?.executionNodeId) throw new ForbiddenException('Worker identity requires an execution node');
    try {
      return await this.commands.execute(new ReportExecutionFailureCommand(
        jobId, principal.executionNodeId, principal.subject, input.failureReason, input.idempotencyKey,
      ));
    } catch (error) {
      if (error instanceof AgentExecutionNotFoundError) throw new NotFoundException(error.message);
      if (error instanceof ExecutionFailureRejectedError) throw new ConflictException(error.message);
      throw error;
    }
  }
}
