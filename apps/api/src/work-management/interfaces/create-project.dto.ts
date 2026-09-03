import { IsString, IsUrl, Length, Matches, MaxLength } from 'class-validator';

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
  declare repositoryUrl: string;

  @IsString()
  @Length(1, 255)
  @Matches(/\S/)
  declare defaultBranch: string;
}
