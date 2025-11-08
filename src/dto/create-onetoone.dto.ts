import { IsMongoId, IsString, IsDate, IsArray, ValidateNested, Matches, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';

class ImageDto {
    @IsString()
    docName?: string;

    @IsString()
    docPath?: string;

    @IsString()
    originalName?: string;
}

export class CreateOneToOneDto {
    @IsMongoId()
    toMember!: string;

    @IsString()
    @Matches(/^(yourlocation|theirlocation|commonlocation)$/)
    whereDidYouMeet!: string;

    @IsDate()
    @Transform(({ value }) => new Date(value))
    date!: Date;

    @IsString()
    address!: string;

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => ImageDto)
    @Transform(({ value }) => {
        if (typeof value === 'string') {
            try {
                return JSON.parse(value);
            } catch (e) {
                return [];
            }
        }
        return value;
    })
    images?: ImageDto[];
}
