import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUrl, Length, Max, Min } from 'class-validator';
import type { ReportedTestOutcome, ReportedTestType } from '../domain/agent-test-state.js';

export class ReportTestResultDto {
  @IsIn(['Unit', 'Integration', 'EndToEnd']) declare type: ReportedTestType;
  @IsIn(['Passed', 'Failed']) declare result: ReportedTestOutcome;
  @IsOptional() @IsInt() @Min(0) @Max(1_000_000) declare testCount?: number;
  @IsArray() @ArrayMaxSize(1_000) @IsString({ each: true }) declare failedTests: string[];
  @IsOptional() @IsInt() @Min(0) declare durationMs?: number;
  @IsOptional() @IsUrl({ require_tld: false }) declare artifactUrl?: string;
  @IsString() @Length(1, 128) declare idempotencyKey: string;
}
