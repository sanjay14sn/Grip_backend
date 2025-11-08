import { IsOptional, IsMongoId, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class ListTestimonialSlipDto {
  @IsOptional()
  @IsMongoId()
  toMember?: string;

  @IsOptional()
  @IsMongoId()
  fromMember?: string;

  @IsOptional()
  @IsNumber()
  isActive?: number;

  @IsOptional()
  @IsNumber()
  isDelete?: number;

  @IsOptional()
  @Type(() => Date)
  fromDate?: Date;

  @IsOptional()
  @Type(() => Date)
  toDate?: Date;
  @IsOptional()
  search?: string;

  @IsOptional()
  sortField?: string;

  @IsOptional()
  sortOrder?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}
