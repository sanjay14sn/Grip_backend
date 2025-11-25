import {
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  IsObject,
} from "class-validator";

export class CreateThankYouSlipDto {
  @IsMongoId()
  toMember!: string;

  @IsOptional()
  @IsObject()
  referralDetail?: {
    name?: string;
    mobileNumber?: string;
    address?: string;
    comments?: string;
    status?: string;
    createdDate?: string;
  };

  @IsNumber()
  amount!: number;

  @IsString()
  @IsOptional()
  comments?: string;

  @IsOptional()
  @IsString()
  referralStatus?: string;

  @IsOptional()
  @IsString()
  referralId?: string;

  @IsOptional()
  @IsString()
  referralName?: string;
}
