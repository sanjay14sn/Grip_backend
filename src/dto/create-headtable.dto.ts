import { IsMongoId, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateHeadTableDto {
  @IsMongoId()
  @IsNotEmpty()
  countryId!: string;

  @IsMongoId()
  @IsNotEmpty()
  stateId!: string;

  @IsMongoId()
  @IsNotEmpty()
  zoneId!: string;

  @IsMongoId()
  @IsNotEmpty()
  chapterId!: string;

  @IsMongoId()
  @IsNotEmpty()
  panelAssociateId!: string;

  @IsNumber()
  @IsOptional()
  isActive?: number;

  @IsNumber()
  @IsOptional()
  isDelete?: number;
}
