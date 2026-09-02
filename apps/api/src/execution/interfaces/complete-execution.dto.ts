import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUrl, IsUUID, Length, MaxLength } from 'class-validator';

export class CompleteExecutionDto {
  @IsString() @Length(1, 10_000) declare summary: string;
  @IsArray() @ArrayMaxSize(1_000) @IsUUID('4', { each: true }) declare satisfiedAcceptanceCriterionIds: string[];
  @IsOptional() @IsString() @MaxLength(255) declare branchName?: string;
  @IsOptional() @IsString() @MaxLength(128) declare commitHash?: string;
  @IsOptional() @IsUrl({ require_tld: false }) declare pullRequestUrl?: string;
  @IsString() @Length(1, 128) declare idempotencyKey: string;
}
