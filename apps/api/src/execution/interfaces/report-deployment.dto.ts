import { IsIn, IsOptional, IsString, IsUrl, Length, MaxLength } from 'class-validator';
import type { ReportedDeploymentStatus } from '../domain/agent-deployment-state.js';

export class ReportDeploymentDto {
  @IsIn(['Development', 'Test', 'Staging', 'Production'])
  declare environment: 'Development' | 'Test' | 'Staging' | 'Production';
  @IsIn(['Pending', 'Running', 'Succeeded', 'Failed', 'RolledBack']) declare status: ReportedDeploymentStatus;
  @IsOptional() @IsString() @MaxLength(255) declare version?: string;
  @IsOptional() @IsString() @MaxLength(128) declare commitHash?: string;
  @IsOptional() @IsUrl({ require_tld: false }) declare url?: string;
  @IsOptional() @IsString() @MaxLength(10_000) declare failureReason?: string;
  @IsString() @Length(1, 128) declare idempotencyKey: string;
}
