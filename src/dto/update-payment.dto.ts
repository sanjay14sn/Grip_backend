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

export class UpdatePaymentDto {
    @IsOptional()
    @IsString()
    @Matches(/^(meeting|event)$/, {
        message: 'Purpose must be either \'meeting\' or \'event\'.',
    })
    purpose?: string;

    @IsOptional()
    @IsString()
    topic?: string;

    @IsOptional()
    @ValidateNested()
    @Type(() => PaymentImageDto)
    image?: PaymentImageDto;

    @IsOptional()
    @IsNumber()
    amount?: number;

    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    chapterId?: string[];

    @IsOptional()
    @IsString()
    comments?: string;

    @IsOptional()
    @IsBoolean()
    paymentRequired?: boolean;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    date?: Date;

    @IsOptional()
    @IsString()
    address?: string;
}
