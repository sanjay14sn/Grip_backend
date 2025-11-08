import { IsEnum, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export enum NotificationType {
    TESTIMONIAL = 'testimonial',
    THANKYOU = 'thankyou',
    ONETOONE = 'onetoone',
    REFERRAL = 'referral',
}

export class CreateNotificationDto {
    @IsEnum(NotificationType)
    type!: NotificationType;

    @IsMongoId()
    toMember!: Types.ObjectId;

    @IsMongoId()
    fromMember!: Types.ObjectId;

    @IsMongoId()
    relatedId!: Types.ObjectId;
}
