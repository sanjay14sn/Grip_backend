import { IsString, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class ListStateDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  countryId?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 10;

  @IsString()
  @IsOptional()
  sortField?: 'stateName' | 'createdAt' | 'updatedAt';

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'asc';
}
