import { IsString, IsEmail, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVisitorDto {
  @IsString()
  name!: string;

  @IsString()
  company!: string;

  @IsString()
  category!: string;

  @IsString()
  mobile!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsDate()
  @Type(() => Date)
  visitDate!: Date;

  // --- Optional fields below ---
  @IsString()
  @IsOptional()
  zone?: string;

  @IsString()
  @IsOptional()
  zoneId?: string;

  @IsString()
  @IsOptional()
  chapter?: string;

  @IsString()
  @IsOptional()
  chapterId?: string;

  @IsString()
  @IsOptional()
  invited_from?: string;

  @IsString()
  @IsOptional()
  invited_by_member?: string;

  @IsString()
  @IsOptional()
  chapter_directory_name?: string;
}
