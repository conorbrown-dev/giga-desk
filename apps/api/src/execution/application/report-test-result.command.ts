import { Command } from '@nestjs/cqrs';
import type { ReportedTestOutcome, ReportedTestType } from '../domain/agent-test-state.js';

export interface StoredTestResult {
  id: string; type: ReportedTestType; result: ReportedTestOutcome; testCount: number | null;
  failedTests: readonly string[]; durationMs: number | null; artifactUrl: string | null; createdAt: string;
}
export class ReportTestResultCommand extends Command<StoredTestResult> {
  constructor(readonly jobId: string, readonly nodeId: string, readonly actorId: string,
    readonly input: Omit<StoredTestResult, 'id' | 'createdAt'>, readonly idempotencyKey: string) { super(); }
}
