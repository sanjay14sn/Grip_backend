import { JsonController, Post, Body, Res } from 'routing-controllers';
import { Response } from 'express';
import { Member } from '../../models/member.model';
import { LoginMemberDto } from '../../dto/login-member.dto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

@JsonController('/api/mobile')
export default class AuthController {
    @Post('/member-login')
    async memberLogin(@Body({ validate: true }) loginData: LoginMemberDto, @Res() res: Response) {
        try {
            const member = await Member.findOne({ 'contactDetails.mobileNumber': loginData.mobileNumber, isActive: 1, status: "active", isDelete: 0 });
            if (!member) {
                return res.status(401).json({ success: false, message: 'Invalid mobile number' });
            }
            const validPin = await bcrypt.compare(loginData.pin, member.pin);
            if (!validPin) {
                return res.status(401).json({ success: false, message: 'Invalid PIN' });
            }

            if (loginData.fcmToken) {
                member.fcmToken = loginData.fcmToken;
                await member.save();
            }
            const token = jwt.sign(
                { id: member._id, mobileNumber: member.contactDetails.mobileNumber },
                process.env.JWT_SECRET || 'your_jwt_secret',
                { expiresIn: '20d' }
            );
            return res.status(200).json({
                success: true,
                token,
                member: {
                    id: member._id,
                    mobileNumber: member.contactDetails.mobileNumber,
                    email: member.contactDetails.email,
                    chapterId: member.chapterInfo?.chapterId,
                    username: `${member.personalDetails?.firstName || ''} ${member.personalDetails?.lastName || ''}`.trim()
                }
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Server error', error: error instanceof Error ? error.message : error });
        }
    }
}
