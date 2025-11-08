import { IsMongoId, IsNumber, IsOptional, IsString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class ListHeadTableDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsMongoId()
  @IsOptional()
  countryId?: string;

  @IsMongoId()
  @IsOptional()
  stateId?: string;

  @IsMongoId()
  @IsOptional()
  zoneId?: string;

  @IsMongoId()
  @IsOptional()
  chapterId?: string;

  @IsMongoId()
  @IsOptional()
  panelAssociateId?: string;

  @IsNumber()
  @Transform(({ value }) => Number(value))
  @IsOptional()
  isActive?: number;

  @IsString()
  @IsOptional()
  sortField?: string;

  @IsString()
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsNumber()
  @Transform(({ value }) => Number(value) || 1)
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @Transform(({ value }) => {
    const limit = Number(value) || 100;
    return limit > 100 ? 100 : limit; // Max limit of 100
  })
  @IsOptional()
  limit?: number = 10;
}
