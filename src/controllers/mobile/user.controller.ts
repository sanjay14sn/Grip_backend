import { JsonController, Get, Param, Res } from 'routing-controllers';
import { Response } from 'express';
import { User } from '../../models/user.model';

@JsonController('/api/mobile/cid')
export default class UserController {
    @Get('/:id')
    async getUser(
        @Param('id') id: string,
        @Res() res: Response
    ) {
        try {
            const user = await User.findById(id)
                .select('-pin')
                .populate({
                    path: 'role',
                    select: '-permissions'
                });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'CID not found'
                });
            }
            return res.status(200).json({
                success: true,
                data: user
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            return res.status(500).json({
                success: false,
                message: errorMessage
            });
        }
    }
}
