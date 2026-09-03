import { Module } from '@nestjs/common';
import { DatabaseModule } from '../shared/infrastructure/database.module.js';
import { ExecutionTargetQueries } from './application/execution-target-queries.js';
import { CreateExecutionJobHandler } from './application/create-execution-job.handler.js';
import { ClaimExecutionJobHandler } from './application/claim-execution-job.handler.js';
import { AgentJobRepository } from './application/agent-job-repository.js';
import { AgentWorkPackageQueries } from './application/agent-work-package-queries.js';
import { DiscoverNodeJobsHandler } from './application/discover-node-jobs.handler.js';
import { GetWorkPackageHandler } from './application/get-work-package.handler.js';
import { AgentExecutionRepository } from './application/agent-execution-repository.js';
import { ReportProgressHandler } from './application/report-progress.handler.js';
import { StartExecutionHandler } from './application/start-execution.handler.js';
import { AgentTestResultRepository } from './application/agent-test-result-repository.js';
import { ReportTestResultHandler } from './application/report-test-result.handler.js';
import { AgentDeploymentRepository } from './application/agent-deployment-repository.js';
import { ReportDeploymentHandler } from './application/report-deployment.handler.js';
import { AgentCompletionRepository } from './application/agent-completion-repository.js';
import { CompleteExecutionHandler } from './application/complete-execution.handler.js';
import { ExecutionJobRepository } from './application/execution-job-repository.js';
import { ListExecutionTargetsHandler } from './application/list-execution-targets.handler.js';
import { PrismaExecutionTargetQueries } from './infrastructure/prisma-execution-target.queries.js';
import { PrismaExecutionJobRepository } from './infrastructure/prisma-execution-job.repository.js';
import { PrismaAgentJobRepository } from './infrastructure/prisma-agent-job.repository.js';
import { PrismaAgentWorkPackageQueries } from './infrastructure/prisma-agent-work-package.queries.js';
import { PrismaAgentExecutionRepository } from './infrastructure/prisma-agent-execution.repository.js';
import { PrismaAgentTestResultRepository } from './infrastructure/prisma-agent-test-result.repository.js';
import { PrismaAgentDeploymentRepository } from './infrastructure/prisma-agent-deployment.repository.js';
import { PrismaAgentCompletionRepository } from './infrastructure/prisma-agent-completion.repository.js';
import { AgentFailureRepository } from './application/agent-failure-repository.js';
import { ReportExecutionFailureHandler } from './application/report-execution-failure.handler.js';
import { PrismaAgentFailureRepository } from './infrastructure/prisma-agent-failure.repository.js';
import { ListWorkItemExecutionsHandler } from './application/list-work-item-executions.handler.js';
import { WorkItemExecutionQueries } from './application/work-item-execution-queries.js';
import { PrismaWorkItemExecutionQueries } from './infrastructure/prisma-work-item-execution.queries.js';
import { AgentJobsController } from './interfaces/agent-jobs.controller.js';
import { ExecutionJobsController } from './interfaces/execution-jobs.controller.js';
import { ExecutionTargetsController } from './interfaces/execution-targets.controller.js';
import { HeartbeatExecutionNodeHandler } from './application/heartbeat-execution-node.handler.js';
import { ExecutionNodeHeartbeatRepository } from './application/execution-node-heartbeat-repository.js';
import { PrismaExecutionNodeHeartbeatRepository } from './infrastructure/prisma-execution-node-heartbeat.repository.js';
import { OpenCodeTargetProvisioner } from './application/opencode-target-provisioner.js';
import { RegisterOpenCodeTargetHandler } from './application/register-opencode-target.command.js';
import { PrismaOpenCodeTargetProvisioner } from './infrastructure/prisma-opencode-target.provisioner.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ExecutionTargetsController, ExecutionJobsController, AgentJobsController],
  providers: [
    ListExecutionTargetsHandler,
    CreateExecutionJobHandler,
    DiscoverNodeJobsHandler,
    ClaimExecutionJobHandler,
    GetWorkPackageHandler,
    StartExecutionHandler,
    ReportProgressHandler,
    ReportTestResultHandler,
    ReportDeploymentHandler,
    CompleteExecutionHandler,
    ReportExecutionFailureHandler,
    ListWorkItemExecutionsHandler,
    HeartbeatExecutionNodeHandler,
    RegisterOpenCodeTargetHandler,
    { provide: ExecutionTargetQueries, useClass: PrismaExecutionTargetQueries },
    { provide: ExecutionJobRepository, useClass: PrismaExecutionJobRepository },
    { provide: AgentJobRepository, useClass: PrismaAgentJobRepository },
    { provide: AgentWorkPackageQueries, useClass: PrismaAgentWorkPackageQueries },
    { provide: AgentExecutionRepository, useClass: PrismaAgentExecutionRepository },
    { provide: AgentTestResultRepository, useClass: PrismaAgentTestResultRepository },
    { provide: AgentDeploymentRepository, useClass: PrismaAgentDeploymentRepository },
    { provide: AgentCompletionRepository, useClass: PrismaAgentCompletionRepository },
    { provide: AgentFailureRepository, useClass: PrismaAgentFailureRepository },
    { provide: WorkItemExecutionQueries, useClass: PrismaWorkItemExecutionQueries },
    { provide: ExecutionNodeHeartbeatRepository, useClass: PrismaExecutionNodeHeartbeatRepository },
    { provide: OpenCodeTargetProvisioner, useClass: PrismaOpenCodeTargetProvisioner },
  ],
})
export class ExecutionModule {}
