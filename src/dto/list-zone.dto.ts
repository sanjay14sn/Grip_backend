import { IsString, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class ListZoneDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  countryName?: string;

  @IsString()
  @IsOptional()
  stateName?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  sortField?: 'countryName' | 'stateName' | 'zoneName' | 'dob' | 'createdAt' | 'updatedAt';

  @IsString()
  @IsOptional()
  sortOrder: 'asc' | 'desc' = 'asc';
}
