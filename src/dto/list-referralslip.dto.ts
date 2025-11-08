import { IsOptional, IsMongoId, IsString, IsNumberString } from 'class-validator';
import { Type } from 'class-transformer';

export class ListReferralSlipDto {
  @IsOptional()
  @IsMongoId()
  toMember?: string;

  @IsOptional()
  @IsMongoId()
  fromMember?: string;

  @IsOptional()
  @IsString()
  referalStatus?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @Type(() => Date)
  fromDate?: Date;

  @IsOptional()
  @Type(() => Date)
  toDate?: Date;
}
