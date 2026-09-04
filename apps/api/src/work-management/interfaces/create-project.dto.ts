import { IsString, IsUrl, Length, Matches, MaxLength } from 'class-validator';
import { PROJECT_DEFAULT_BRANCH_PATTERN, PROJECT_REPOSITORY_URL_PATTERN } from '../domain/project.js';

export class CreateProjectDto {
  @IsString()
  @Matches(/^[A-Za-z][A-Za-z0-9]{1,11}$/)
  declare key: string;

  @IsString()
  @Length(1, 120)
  @Matches(/\S/)
  declare name: string;

  @IsString()
  @MaxLength(10_000)
  declare description: string;

  @IsString()
  @Length(1, 10_000)
  @Matches(/\S/)
  declare businessGoal: string;

  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @Matches(PROJECT_REPOSITORY_URL_PATTERN)
  declare repositoryUrl: string;

  @IsString()
  @Length(1, 255)
  @Matches(/\S/)
  @Matches(PROJECT_DEFAULT_BRANCH_PATTERN)
  declare defaultBranch: string;
}
