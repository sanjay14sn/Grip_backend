import { IsMongoId, IsNotEmpty } from "class-validator";

export class TopAchiverDto {
  @IsMongoId()
  @IsNotEmpty()
  referrals!: string;

  @IsMongoId()
  @IsNotEmpty()
  business!: string;

  @IsMongoId()
  @IsNotEmpty()
  visitors!: string;
}
