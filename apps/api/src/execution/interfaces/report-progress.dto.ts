import { IsString, Length } from 'class-validator';

export class ReportProgressDto {
  @IsString() @Length(1, 80) declare phase: string;
  @IsString() @Length(1, 10_000) declare message: string;
  @IsString() @Length(1, 128) declare idempotencyKey: string;
}
