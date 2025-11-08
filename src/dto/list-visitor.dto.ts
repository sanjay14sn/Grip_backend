import { IsOptional, IsString, IsIn, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class ListVisitorDto {
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    page?: number;

    @IsOptional()
    @IsInt()
    @Type(() => Number)
    limit?: number;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    sortField?: string = 'createdAt';

    @IsOptional()
    sortOrder?: 'asc' | 'desc' = 'desc';

    @IsOptional()
    @Type(() => Date)
    fromDate?: Date;

    @IsOptional()
    @Type(() => Date)
    toDate?: Date;
}
