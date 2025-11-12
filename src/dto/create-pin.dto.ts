import { IsString, IsOptional } from "class-validator";

export class CreatePinDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  image?: string;
}

export class UpdatePinDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  image?: string;
}
