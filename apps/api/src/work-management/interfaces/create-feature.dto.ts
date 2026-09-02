import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, Matches, MaxLength } from 'class-validator';

export class CreateFeatureDto {
  @IsString()
  @MaxLength(200)
  @Matches(/\S/)
  declare title: string;

  @IsString()
  @MaxLength(10_000)
  declare description: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(1_000, { each: true })
  @Matches(/\S/, { each: true })
  declare acceptanceCriteria: string[];
}
