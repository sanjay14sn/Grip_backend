import { IsNotEmpty, IsEmail } from "class-validator";

export class ExpectedVisitorDto {
  @IsNotEmpty()
  name!: string;

  @IsNotEmpty()
  company!: string;

  @IsNotEmpty()
  category!: string;

  @IsNotEmpty()
  mobile!: string;

  @IsEmail()
  email!: string;

  @IsNotEmpty()
  address!: string;

  @IsNotEmpty()
  visitDate!: string;

  @IsNotEmpty()
  invitedBy!: string;

  @IsNotEmpty()
  createdBy!: string;

  chapterId?: string;
  zoneId?: string;
}
