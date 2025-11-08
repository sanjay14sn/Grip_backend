import { IsMongoId, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateThankYouSlipDto {
    @IsMongoId()
    toMember!: string;

    @IsNumber()
    amount!: number;

    @IsString()
    @IsOptional()
    comments?: string;
}
