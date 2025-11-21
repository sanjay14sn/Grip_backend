import { IsString, IsObject, IsNotEmpty } from "class-validator";

export class SendReferralStatusMailDto {
  @IsString()
  @IsNotEmpty()
  referralId!: string;

  @IsString()
  @IsNotEmpty()
  status!: string;

  @IsObject()
  @IsNotEmpty()
  toMember!: {
    firstName: string;
    lastName: string;
  };

  @IsObject()
  @IsNotEmpty()
  fromMember!: {
    firstName: string;
    lastName: string;
  };

  @IsObject()
  @IsNotEmpty()
  referralDetail!: {
    name: string;
    category: string;
    mobileNumber: string;
    address: string;
    comments: string;
    status: string;
    createdDate: string;
  };
}
