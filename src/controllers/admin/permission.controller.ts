import { JsonController, Post, Res, InternalServerError, Get } from 'routing-controllers';
import { Response } from 'express';
import { Permission } from '../../models/permission.model';
import { PermissionsLists } from '../../services/permission-list';

@JsonController('/api/admin/permissions')
export default class PermissionController {

    @Post('/seed')
    async seedPermissions(@Res() res: Response) {
        // try {
        for (const permissionData of PermissionsLists) {
            await Permission.findOneAndUpdate(
                { key: permissionData.key },
                permissionData,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }
        return res.json({ success: true, message: 'Permissions synced' });
        // } catch (error) {
        //     console.error('Error seeding permissions:', error);
        //     throw new InternalServerError('Failed to seed permissions');
        // }
    }

    @Get('/')
    async getAllPermissions(@Res() res: Response) {
        try {
            const permissions = await Permission.find({ isDelete: 0 });
            return res.status(200).json({
                success: true,
                message: 'Permissions retrieved successfully',
                data: permissions
            });
        } catch (error: unknown) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch permissions',
                error: error instanceof Error ? error.message : 'An unknown error occurred'
            });
        }
    }
}
