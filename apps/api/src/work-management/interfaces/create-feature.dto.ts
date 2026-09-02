import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';

class VisualReferenceDto {
  @IsString() @MaxLength(200) @Matches(/^[^/\\]+$/)
  declare name: string;

  @IsIn(['image/png', 'image/jpeg', 'image/webp'])
  declare mediaType: 'image/png' | 'image/jpeg' | 'image/webp';

  @IsString() @MaxLength(4_000_000) @Matches(/^[A-Za-z0-9+/]+={0,2}$/)
  declare dataBase64: string;
}

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

  @IsOptional() @IsArray() @ArrayMaxSize(3) @ValidateNested({ each: true }) @Type(() => VisualReferenceDto)
  declare visualReferences?: VisualReferenceDto[];
}
