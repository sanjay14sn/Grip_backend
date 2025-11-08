import { IsOptional, IsString, IsNumberString, IsIn, IsDateString, IsNumber } from 'class-validator';

export class ListThankYouSlipDto {
  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortField?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  fromDate?: Date;

  @IsOptional()
  toDate?: Date;
}
