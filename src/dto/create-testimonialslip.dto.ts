import { IsMongoId, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ImageDto {
  @IsString()
  docName!: string;

  @IsString()
  docPath!: string;

  @IsString()
  originalName!: string;
}

export class CreateTestimonialSlipDto {
  @IsMongoId()
  toMember!: string;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageDto)
  images?: ImageDto[];
}
