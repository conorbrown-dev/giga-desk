import type { ReportTestResultCommand, StoredTestResult } from './report-test-result.command.js';

export abstract class AgentTestResultRepository {
  abstract report(command: ReportTestResultCommand): Promise<StoredTestResult>;
}
