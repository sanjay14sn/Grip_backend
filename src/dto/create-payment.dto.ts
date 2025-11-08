import {
    IsString,
    IsOptional,
    IsNumber,
    IsMongoId,
    IsBoolean,
    IsDate,
    ValidateNested,
    Matches,
    IsArray,
    IsNotEmpty,
    ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

class PaymentImageDto {
    @IsString()
    docName!: string;

    @IsString()
    docPath!: string;

    @IsString()
    originalName!: string;
}

export class CreatePaymentDto {
    @IsString()
    @Matches(/^(meeting|event)$/, {
        message: 'Purpose must be either \'meeting\' or \'event\'.',
    })
    purpose!: string;

    @IsString()
    topic!: string;

    @ValidateNested()
    @IsOptional()
    @Type(() => PaymentImageDto)
    image?: PaymentImageDto;

    @IsNumber()
    amount!: number;

    @IsArray()
    @IsNotEmpty()
    @ArrayNotEmpty()
    @IsMongoId({ each: true, message: 'Each chapterId must be a valid Mongo ID' })
    chapterId!: string[];

    @IsOptional()
    @IsString()
    comments?: string;

    @IsOptional()
    @IsBoolean()
    paymentRequired?: boolean;

    @IsDate()
    @Type(() => Date)
    startDate!: Date;

    @IsDate()
    @Type(() => Date)
    endDate!: Date;

    @IsString()
    address!: string;

    @IsNumber()
    latitude!: number;

    @IsNumber()
    longitude!: number;
}
