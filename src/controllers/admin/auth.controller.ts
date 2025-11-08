import { JsonController, Post, Body, Res } from 'routing-controllers';
import { Response } from 'express';
import { User } from '../../models/user.model';
import { LoginUserDto } from '../../dto/login-user.dto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Member } from '../../models/member.model';

@JsonController('/api/admin')
export default class AuthController {
    @Post('/user-login')
    async userLogin(@Body({ validate: true }) loginData: LoginUserDto, @Res() res: Response) {
        try {
            const user = await User.findOne({ mobileNumber: loginData.mobileNumber, isActive: 1, isDelete: 0 }) || await Member.findOne({ 'contactDetails.mobileNumber': loginData.mobileNumber, isHeadtable: true, status: "active", isDelete: 0 });
            if (!user) {
                return res.status(401).json({ success: false, message: 'Invalid mobile number' });
            }
            const validPin = await bcrypt.compare(loginData.pin, user.pin);
            if (!validPin) {
                return res.status(401).json({ success: false, message: 'Invalid PIN' });
            }
            const token = jwt.sign(
                { id: user._id, mobileNumber: user.mobileNumber, role: user.role },
                process.env.JWT_SECRET || 'your_jwt_secret',
                { expiresIn: '1d' }
            );
            return res.status(200).json({
                success: true,
                token,
                user: {
                    id: user._id,
                    mobileNumber: user.mobileNumber,
                    name: user.name,
                    role: user.role,
                    email: user.email,
                    companyName: user.companyName
                }
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error instanceof Error ? error.message : error
            });
        }
    }
}
