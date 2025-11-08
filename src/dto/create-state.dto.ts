import { IsString, MinLength, IsMongoId } from 'class-validator';

export class CreateStateDto {
  @IsString()
  @MinLength(2)
  stateName!: string;

  @IsMongoId()
  countryId!: string;
}
