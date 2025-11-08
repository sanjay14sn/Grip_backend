import { IsString, IsDate, MinLength, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateZoneDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  countryName!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  stateName!: string;

  @IsString()
  @MinLength(2)
  zoneName!: string;

  @IsDate()
  @Type(() => Date)
  dob!: Date;
}
