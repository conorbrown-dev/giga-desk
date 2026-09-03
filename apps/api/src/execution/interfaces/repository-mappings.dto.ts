import { IsArray, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RepositoryMappingDto {
  @IsString() @MinLength(1) @MaxLength(500)
  url!: string;

  @IsString() @MinLength(1) @MaxLength(1_000)
  path!: string;
}

export class RepositoryMappingsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => RepositoryMappingDto)
  mappings!: readonly RepositoryMappingDto[];
}
