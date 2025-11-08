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
}
