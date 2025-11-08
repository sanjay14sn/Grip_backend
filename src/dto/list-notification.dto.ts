import { IsOptional, IsIn } from 'class-validator';

export class ListNotificationDto {
    @IsOptional()

    page?: number;

    @IsOptional()
    limit?: number;

    @IsOptional()
    @IsIn(['read', 'unread'])
    filter?: 'read' | 'unread';
}
