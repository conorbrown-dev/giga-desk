import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterCodexTargetDto {
  @IsString() @MinLength(1) @MaxLength(255)
  hostname!: string;

  @IsString() @MinLength(1) @MaxLength(100)
  operatingSystem!: string;

  @IsString() @MinLength(1) @MaxLength(100)
  architecture!: string;

  @IsString() @Matches(/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/)
  agentVersion!: string;
}
