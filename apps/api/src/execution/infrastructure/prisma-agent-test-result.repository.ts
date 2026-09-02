import { Injectable } from '@nestjs/common';
import { Prisma, type TestResult } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/infrastructure/prisma.service.js';
import { AgentExecutionNotFoundError } from '../application/agent-execution-repository.js';
import { AgentTestResultRepository } from '../application/agent-test-result-repository.js';
import type { ReportTestResultCommand, StoredTestResult } from '../application/report-test-result.command.js';
import { assertCanReportTests } from '../domain/agent-test-state.js';

const toResult = (result: TestResult): StoredTestResult => ({
  id: result.id, type: result.type, result: result.result, testCount: result.testCount,
  failedTests: Array.isArray(result.failedTests)
    ? result.failedTests.filter((item): item is string => typeof item === 'string') : [],
  durationMs: result.durationMs, artifactUrl: result.artifactUrl, createdAt: result.createdAt.toISOString(),
});

@Injectable()
export class PrismaAgentTestResultRepository extends AgentTestResultRepository {
  constructor(private readonly database: PrismaService) { super(); }

  async report(command: ReportTestResultCommand): Promise<StoredTestResult> {
    const job = await this.database.executionJob.findFirst({
      where: { id: command.jobId, executionNodeId: command.nodeId },
      select: { status: true, workItemId: true, workItem: { select: { projectId: true, status: true } } },
    });
    if (!job) throw new AgentExecutionNotFoundError('Execution job not found for this node');
    const existing = await this.database.testResult.findUnique({ where: {
      executionJobId_idempotencyKey: { executionJobId: command.jobId, idempotencyKey: command.idempotencyKey },
    } });
    if (existing) return toResult(existing);
    assertCanReportTests(job.status, command.input.type);
    try {
      return await this.database.$transaction(async (transaction) => {
        const result = await transaction.testResult.create({ data: {
          executionJobId: command.jobId, ...command.input, failedTests: [...command.input.failedTests],
          idempotencyKey: command.idempotencyKey,
        } });
        if (command.input.type !== 'EndToEnd') {
          await transaction.executionJob.update({ where: { id: command.jobId }, data: { status: 'Testing' } });
          await transaction.workItem.update({ where: { id: job.workItemId }, data: { status: 'Testing' } });
        }
        await transaction.activity.create({ data: {
          projectId: job.workItem.projectId, workItemId: job.workItemId, actorId: command.actorId,
          eventType: 'TestResultReported', metadata: { executionJobId: command.jobId,
            testType: command.input.type, result: command.input.result, testCount: command.input.testCount },
        } });
        if (command.input.type !== 'EndToEnd' && job.workItem.status === 'InProgress') {
          await transaction.activity.create({ data: {
            projectId: job.workItem.projectId, workItemId: job.workItemId, actorId: command.actorId,
            eventType: 'WorkItemStatusChanged', metadata: { from: 'InProgress', to: 'Testing' },
          } });
        }
        return toResult(result);
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
      return toResult(await this.database.testResult.findUniqueOrThrow({ where: {
        executionJobId_idempotencyKey: { executionJobId: command.jobId, idempotencyKey: command.idempotencyKey },
      } }));
    }
  }
}
