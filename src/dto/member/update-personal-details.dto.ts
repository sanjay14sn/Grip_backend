import { IsString, IsOptional } from 'class-validator';

export class UpdatePersonalDetailsDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  /**
   * The image file. This is handled by file upload middleware (e.g., multer)
   * and is not expected in the request body.
   */
  image?: any;
}
