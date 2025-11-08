import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

export class UpdatePinDto {
  @IsString()
  @IsNotEmpty()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  @Matches(/^\d+$/, { message: 'PIN must contain only numbers' })
  newPin!: string;

  @IsString()
  @IsNotEmpty()
  @Length(4, 4, { message: 'Current PIN must be exactly 4 digits' })
  @Matches(/^\d+$/, { message: 'Current PIN must contain only numbers' })
  currentPin!: string;
}
