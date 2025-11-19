import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  IsMongoId,
  IsEmail,
  IsUrl,
  Matches,
  ArrayMinSize,
  IsArray,
} from "class-validator";
import { ObjectId } from "mongoose";

class ChapterInfoDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z\s-]+$/, {
    message: "Country name must contain only letters, spaces, and hyphens",
  })
  declare countryName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z\s-]+$/, {
    message: "State name must contain only letters, spaces, and hyphens",
  })
  declare stateName: string;

  @IsMongoId()
  @IsNotEmpty({ message: "Zone ID is required" })
  declare zoneId: string;

  @IsMongoId()
  @IsNotEmpty({ message: "Chapter ID is required" })
  declare chapterId: string;

  @IsArray()
  @IsNotEmpty({ message: "CID ID is required" })
  declare CIDId: ObjectId[];

  @IsString()
  @IsNotEmpty({ message: "Who invited you is required" })
  whoInvitedYou?: string;

  @IsString()
  @IsNotEmpty({ message: "How did you hear about GRIP is required" })
  howDidYouHearAboutGRIP?: string;
}

class PinObjectDto {
  @IsMongoId()
  _id!: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsOptional()
  image?: any;
}

class PersonalDetailsDto {
  @IsString()
  @IsNotEmpty({ message: "First name is required" })
  declare firstName: string;

  @IsString()
  @IsOptional()
  declare lastName: string;

  @IsString()
  @IsNotEmpty({ message: "Company name is required" })
  declare companyName: string;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsNotEmpty({ message: "Category represented is required" })
  categoryRepresented?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  dob?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  renewalDate?: Date;

  @IsBoolean()
  @IsNotEmpty({ message: "Previously GRIP member is required" })
  previouslyGRIPMember?: boolean;

  @IsString()
  @IsOptional()
  otherNetworkingOrgs?: string;

  @IsBoolean()
  @IsNotEmpty({ message: "Is other networking organizations is required" })
  isOtherNetworkingOrgs?: boolean;

  @IsString()
  @IsOptional()
  education?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PinObjectDto)
  pins?: PinObjectDto[];
}

class BusinessAddressDto {
  @IsString()
  @IsNotEmpty({ message: "Address line 1 is required" })
  addressLine1?: string;

  @IsString()
  @IsNotEmpty({ message: "Address line 2 is required" })
  addressLine2?: string;

  @IsString()
  @IsNotEmpty({ message: "State is required" })
  state?: string;

  @IsString()
  @IsNotEmpty({ message: "City is required" })
  city?: string;

  @IsString()
  @IsNotEmpty({ message: "Postal code is required" })
  postalCode?: string;
}

class ContactDetailsDto {
  @IsEmail()
  @IsNotEmpty({ message: "Email is required" })
  declare email: string;

  @IsNotEmpty({ message: "Mobile number is required" })
  @Matches(/^[0-9]{10}$/, {
    message: "Mobile number must be exactly 10 digits",
  })
  declare mobileNumber: string;

  @IsOptional()
  secondaryPhone?: string;

  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  gstNumber?: string;
}

class BusinessDetailsDto {
  @IsString()
  @IsOptional()
  businessDescription?: string;

  @IsString()
  @IsOptional()
  yearsInBusiness?: string;
}

class BusinessReferenceDto {
  @IsString()
  @IsOptional()
  declare firstName: string;

  @IsString()
  @IsOptional()
  declare lastName: string;

  @IsString()
  @IsOptional()
  declare businessName: string;

  @Transform(({ value }) => (value === "" ? undefined : value))
  @IsOptional()
  @Matches(/^[0-9]{10}$/, {
    message: "Phone number must be exactly 10 digits",
  })
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  declare relationship: string;

  @IsBoolean()
  @IsOptional()
  contactSharingGRIP: boolean = false;

  @IsBoolean()
  @IsOptional()
  contactSharingGRIPReferences: boolean = false;
}

class TermsAndCertificationsDto {
  @IsBoolean()
  @IsOptional()
  willAttendMeetingsOnTime: boolean = false;

  @IsBoolean()
  @IsOptional()
  willBringVisitors: boolean = false;

  @IsBoolean()
  @IsOptional()
  willDisplayPositiveAttitude: boolean = false;

  @IsBoolean()
  @IsOptional()
  understandsContributorsWin: boolean = false;

  @IsBoolean()
  @IsOptional()
  willAbideByPolicies: boolean = false;

  @IsBoolean()
  @IsOptional()
  willContributeBestAbility: boolean = false;
}

export class UpdateMemberStatusDto {
  @IsOptional()
  @Matches(/^(pending|active|decline)$/)
  status?: "pending" | "active" | "decline";
}

export class UpdateMemberTypeDto {
  @IsOptional()
  type?: string;

  @IsOptional()
  @IsBoolean()
  isHeadtable?: boolean;

  @IsOptional()
  role?: string;

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  pins?: string[];
}

export class UpdateMemberDto {
  @ValidateNested()
  @Type(() => ChapterInfoDto)
  @IsOptional()
  declare chapterInfo?: ChapterInfoDto;

  @ValidateNested()
  @Type(() => PersonalDetailsDto)
  @IsOptional()
  declare personalDetails?: PersonalDetailsDto;

  @ValidateNested()
  @Type(() => BusinessAddressDto)
  @IsOptional()
  declare businessAddress?: BusinessAddressDto;

  @ValidateNested()
  @Type(() => ContactDetailsDto)
  @IsOptional()
  declare contactDetails?: ContactDetailsDto;

  @ValidateNested()
  @Type(() => BusinessDetailsDto)
  @IsOptional()
  declare businessDetails?: BusinessDetailsDto;

  @ValidateNested({ each: true })
  @Type(() => BusinessReferenceDto)
  @ArrayMinSize(1, { message: "At least one business reference is required" })
  @IsOptional()
  declare businessReferences?: BusinessReferenceDto[];

  @ValidateNested()
  @Type(() => TermsAndCertificationsDto)
  @IsOptional()
  declare termsAndCertifications?: TermsAndCertificationsDto;

  @IsOptional()
  isActive?: number = 1;

  @IsOptional()
  isDelete?: number = 0;

  @IsOptional()
  @IsMongoId()
  role?: string;

  @IsOptional()
  @IsBoolean()
  isHeadtable?: boolean = false;

  @IsOptional()
  @Matches(/^(pending|active|decline)$/)
  status?: "pending" | "active" | "decline" = "pending";

  @IsOptional()
  type?: string = "member";

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  pins?: string[];
}

export class UpdateProfileMemberDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  website?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;
}

export class CreateMemberDto {
  @IsOptional()
  @IsString()
  pin?: string = "1234";

  @ValidateNested()
  @Type(() => ChapterInfoDto)
  @IsOptional()
  declare chapterInfo?: ChapterInfoDto;

  @ValidateNested()
  @Type(() => PersonalDetailsDto)
  @IsOptional()
  declare personalDetails?: PersonalDetailsDto;

  @ValidateNested()
  @Type(() => BusinessAddressDto)
  @IsOptional()
  declare businessAddress?: BusinessAddressDto;

  @ValidateNested()
  @Type(() => ContactDetailsDto)
  @IsOptional()
  declare contactDetails?: ContactDetailsDto;

  @ValidateNested()
  @Type(() => BusinessDetailsDto)
  @IsOptional()
  declare businessDetails?: BusinessDetailsDto;

  @ValidateNested({ each: true })
  @Type(() => BusinessReferenceDto)
  @ArrayMinSize(1, { message: "At least one business reference is required" })
  @IsOptional()
  declare businessReferences?: BusinessReferenceDto[];

  @ValidateNested()
  @Type(() => TermsAndCertificationsDto)
  @IsOptional()
  declare termsAndCertifications?: TermsAndCertificationsDto;

  @IsOptional()
  isActive?: number = 1;

  @IsOptional()
  isDelete?: number = 0;

  @IsOptional()
  @IsMongoId()
  role?: string;

  @IsOptional()
  @IsBoolean()
  isHeadtable?: boolean = false;

  @IsOptional()
  @Matches(/^(pending|active|decline)$/)
  status?: "pending" | "active" | "decline" = "pending";

  @IsOptional()
  type?: string = "member";
}
export class CreateMemberbychapterDto {
  @IsMongoId()
  @IsNotEmpty()
  declare chapterId: string;

  @IsString()
  @IsOptional()
  whoInvitedYou?: string;

  @IsString()
  @IsOptional()
  howDidYouHearAboutGRIP?: string;

  @IsOptional()
  @IsString()
  pin?: string = "1234";

  @ValidateNested()
  @Type(() => PersonalDetailsDto)
  @IsOptional()
  declare personalDetails?: PersonalDetailsDto;

  @ValidateNested()
  @Type(() => BusinessAddressDto)
  @IsOptional()
  declare businessAddress?: BusinessAddressDto;

  @ValidateNested()
  @Type(() => ContactDetailsDto)
  @IsOptional()
  declare contactDetails?: ContactDetailsDto;

  @ValidateNested()
  @Type(() => BusinessDetailsDto)
  @IsOptional()
  declare businessDetails?: BusinessDetailsDto;

  @ValidateNested({ each: true })
  @Type(() => BusinessReferenceDto)
  @ArrayMinSize(1, { message: "At least one business reference is required" })
  @IsOptional()
  declare businessReferences?: BusinessReferenceDto[];

  @ValidateNested()
  @Type(() => TermsAndCertificationsDto)
  @IsOptional()
  declare termsAndCertifications?: TermsAndCertificationsDto;

  @IsOptional()
  isActive?: number = 1;

  @IsOptional()
  isDelete?: number = 0;

  @IsOptional()
  @IsMongoId()
  role?: string;

  @IsOptional()
  @IsBoolean()
  isHeadtable?: boolean = false;

  @IsOptional()
  @Matches(/^(pending|active|decline)$/)
  status?: "pending" | "active" | "decline" = "pending";

  @IsOptional()
  type?: string = "member";
}
