import { IsString, IsOptional, IsMongoId, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ReferralDetailDto {
  @IsString()
  name!: string;

  @IsString()
  category!: string;

  @IsString()
  mobileNumber!: string;

  @IsString()
  @IsOptional()
  comments?: string;

  @IsString()
  @IsOptional()
  address?: string;
}

export class CreateReferralSlipDto {
  @IsMongoId()
  toMember!: string;

  @IsString()
  @Matches(/^(told them you would call|given your card)$/)
  referalStatus!: string;

  @ValidateNested()
  @Type(() => ReferralDetailDto)
  referalDetail!: ReferralDetailDto;
}
