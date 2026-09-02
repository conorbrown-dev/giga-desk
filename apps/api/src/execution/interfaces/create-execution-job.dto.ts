import { IsBoolean, IsUUID } from 'class-validator';
export class CreateExecutionJobDto {
  @IsUUID() declare executionNodeId: string;
  @IsUUID() declare agentId: string;
  @IsUUID() declare modelId: string;
  @IsBoolean() declare protectedActionsApproved: boolean;
}
