import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { AgentTestResultRepository } from './agent-test-result-repository.js';
import { ReportTestResultCommand, type StoredTestResult } from './report-test-result.command.js';

@CommandHandler(ReportTestResultCommand)
export class ReportTestResultHandler implements ICommandHandler<ReportTestResultCommand> {
  constructor(private readonly results: AgentTestResultRepository) {}
  execute(command: ReportTestResultCommand): Promise<StoredTestResult> { return this.results.report(command); }
}
