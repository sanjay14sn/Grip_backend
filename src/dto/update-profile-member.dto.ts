import { IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class PersonalDetailsDto {
  @IsOptional()
  firstName?: string;

  @IsOptional()
  lastName?: string;

  @IsOptional()
  dob?: string;
}

class ContactDetailsDto {
  @IsOptional()
  secondaryPhone?: string;

  @IsOptional()
  website?: string;
}

class BusinessAddressDto {
  @IsOptional()
  addressLine1?: string;

  @IsOptional()
  addressLine2?: string;

  @IsOptional()
  city?: string;

  @IsOptional()
  state?: string;

  @IsOptional()
  postalCode?: string;
}

class BusinessDetailsDto {
  @IsOptional()
  businessDescription?: string;

  @IsOptional()
  yearsInBusiness?: string;
}

export class UpdateProfileMemberDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => PersonalDetailsDto)
  personalDetails?: PersonalDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactDetailsDto)
  contactDetails?: ContactDetailsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessAddressDto)
  businessAddress?: BusinessAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessDetailsDto)
  businessDetails?: BusinessDetailsDto;
}
