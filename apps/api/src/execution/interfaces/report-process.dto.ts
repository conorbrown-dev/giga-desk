import { IsInt, Max, Min } from 'class-validator';

export class ReportProcessDto {
  @IsInt() @Min(1) @Max(2_147_483_647)
  processId!: number;
}
