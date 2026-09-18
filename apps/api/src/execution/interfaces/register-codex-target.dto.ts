import { IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterCodexTargetDto {
  @IsString() @MinLength(1) @MaxLength(255)
  hostname!: string;

  @IsString() @MinLength(1) @MaxLength(100)
  operatingSystem!: string;

  @IsString() @MinLength(1) @MaxLength(100)
  architecture!: string;

  @IsString() @Matches(/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/)
  agentVersion!: string;

  @IsOptional() @IsIn(['CodexAppServer', 'CodexSdk', 'ClaudeAgentSdk'])
  agentType?: 'CodexAppServer' | 'CodexSdk' | 'ClaudeAgentSdk';

  @IsOptional() @IsString() @MinLength(1) @MaxLength(120)
  agentName?: string;

  @IsOptional() @IsString() @MinLength(1) @MaxLength(255)
  modelIdentifier?: string;
}
