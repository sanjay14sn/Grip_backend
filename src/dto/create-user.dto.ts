import { Type } from 'class-transformer';
import { IsString, IsOptional, IsEmail, IsMongoId, MinLength, Matches, Length, IsNotEmpty, ValidateNested } from 'class-validator';

export class ProfileImageDto {
  @IsString()
  docName!: string;

  @IsString()
  docPath!: string;

  @IsString()
  originalName!: string;
}
export class CreateUserDto {
  @ValidateNested()
  @IsOptional()
  @Type(() => ProfileImageDto)
  profileImage?: ProfileImageDto;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(2)
  companyName!: string;

  @IsString()
  @IsEmail()
  email!: string; // Not unique

  @IsString()
  username!: string;

  @IsString()
  @IsNotEmpty({ message: 'Mobile number is required' })
  mobileNumber!: string;

  @IsString()
  @IsMongoId()
  role!: string;

  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  pin!: string;
}
