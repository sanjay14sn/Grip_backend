import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class LoginUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Mobile number is required' })
  mobileNumber!: string;

  @IsString()
  @IsNotEmpty({ message: 'PIN is required' })
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  @Matches(/^\d+$/, { message: 'PIN must contain only numbers' })
  pin!: string;
}
