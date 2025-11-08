import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreatePermissionDto {
    @IsString()
    @IsNotEmpty()
    key!: string;

    @IsString()
    @IsNotEmpty()
    group!: string;

    @IsString()
    @IsNotEmpty()
    type!: string;

    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsNumber()
    @IsNotEmpty()
    order!: number;

    @IsString()
    @IsNotEmpty()
    category!: string;
}
