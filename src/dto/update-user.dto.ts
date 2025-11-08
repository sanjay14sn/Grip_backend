import { IsString, IsOptional, IsEmail, IsMongoId, MinLength, Length, IsNotEmpty, ValidateNested } from 'class-validator';
import { ProfileImageDto } from './create-user.dto';
import { Type } from 'class-transformer';

export class UpdateUserDto {
    @ValidateNested()
    @IsOptional()
    @Type(() => ProfileImageDto)
    profileImage?: ProfileImageDto;

    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;

    @IsOptional()
    @IsString()
    @MinLength(2)
    companyName?: string;

    @IsOptional()
    @IsString()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    username?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty({ message: 'Mobile number is required' })
    mobileNumber?: string;

    @IsOptional()
    @IsString()
    @IsMongoId()
    role?: string;
}
