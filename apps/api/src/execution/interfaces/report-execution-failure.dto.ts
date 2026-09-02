import { IsString, Length, MaxLength } from 'class-validator';

export class ReportExecutionFailureDto {
  @IsString() @Length(1, 4_000) declare failureReason: string;
  @IsString() @Length(1, 128) @MaxLength(128) declare idempotencyKey: string;
}
