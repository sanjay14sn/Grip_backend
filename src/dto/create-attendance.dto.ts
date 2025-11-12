import { IsNotEmpty, IsNumber, IsOptional, IsMongoId, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class LocationDto {
    @IsNumber()
    @Type(() => Number)
    lat?: number;

    @IsNumber()
    @Type(() => Number)
    lng?: number;
}

export class CreateAttendanceDto {

    @IsMongoId()
    @IsOptional()
    memberId?: string;

    @IsMongoId()
    @IsNotEmpty()
    meetingId!: string;

    @IsOptional()
    @IsString()
    status?: 'present' | 'late' | 'absent' | "medical" | "substitute" = 'absent';

    @IsOptional()
    @Type(() => LocationDto)
    userLocation?: LocationDto;

    // ✅ Add your extra field here
    @IsOptional()
    @IsString()
    from?: string; // or enum type if you know possible values
}

export class UpdateAttendanceDto {
    @IsOptional()
    @Type(() => LocationDto)
    userLocation?: LocationDto;
}
