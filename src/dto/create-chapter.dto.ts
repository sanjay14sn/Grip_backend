import { IsString, IsMongoId, IsDate, IsEnum, MinLength, IsOptional, IsNotEmpty, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export enum MeetingType {
    ONLINE = 'Online',
    IN_PERSON = 'In Person',
    HYBRID = 'Hybrid'
}

export class CreateChapterDto {
    @IsString()
    @MinLength(2)
    @IsNotEmpty()
    chapterName!: string;

    @IsString()
    @MinLength(2)
    @IsNotEmpty()
    countryName!: string;

    @IsString()
    @MinLength(2)
    @IsNotEmpty()
    stateName!: string;

    @IsMongoId()
    zoneId!: string;

    @IsArray()
    cidId!: string[];

    @IsMongoId()
    mentorId!: string;

    @IsString()
    @IsOptional()
    meetingVenue?: string;

    @IsDate()
    @Type(() => Date)
    chapterCreatedDate!: Date;

    @IsDate()
    @Type(() => Date)
    @IsOptional()
    meetingDayAndTime?: Date;

    @IsEnum(MeetingType)
    meetingType!: MeetingType;

    @IsString()
    @IsNotEmpty({ message: "Weekday is required" })
    @IsEnum(
        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        { message: "Weekday must be a valid day of the week" }
    )
    weekday!: string;
}
