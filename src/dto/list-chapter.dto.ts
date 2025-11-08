import { IsOptional, IsString, IsNumber, IsEnum, IsMongoId } from 'class-validator';

export class ListChapterDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  sortField?: 'chapterName' | 'countryName' | 'stateName' | 'zoneId' | 'createdAt' | 'updatedAt';

  @IsString()
  @IsOptional()
  sortOrder: 'asc' | 'desc' = 'asc';

  @IsString()
  @IsOptional()
  countryName?: string;

  @IsString()
  @IsOptional()
  stateName?: string;

  @IsMongoId()
  @IsOptional()
  zoneId?: string;
}
