import { IsOptional, IsNumber, Min, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class ListPaymentDto {
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number = 100;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    sortField?: string;

    @IsOptional()
    @IsString()
    @IsIn(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc';

    @IsOptional()
    @IsString()
    @IsIn(['meeting', 'event'])
    purpose?: 'meeting' | 'event';
}
