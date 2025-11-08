import {
  IsOptional,
  IsNumber,
  Min,
  IsString,
  IsIn,
} from "class-validator";
import { Transform } from "class-transformer";

export class ListMembersDto {
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit: number = 10;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  @IsIn(["asc", "desc"])
  sort: "asc" | "desc" = "desc";

  @IsString()
  @IsOptional()
  sortBy?: string = "createdAt";

  @IsString()
  @IsOptional()
  status?: "active" | "pending" | "decline";

  @IsString()
  @IsOptional()
  countryName?: string;

  @IsString()
  @IsOptional()
  stateName?: string;

  @IsString()
  @IsOptional()
  zoneId?: string;

  @IsString()
  @IsOptional()
  chapterId?: string;

  @IsString()
  @IsOptional()
  CIDId?: string;
}
