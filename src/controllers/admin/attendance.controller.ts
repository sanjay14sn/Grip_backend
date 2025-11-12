import {
    JsonController,
    Post,
    Get,
    Delete,
    Body,
    Param,
    QueryParams,
    Res,
    NotFoundError,
    InternalServerError,
    UseBefore,
    Req,
    Put,
} from 'routing-controllers';
import { Request, Response } from 'express';
import { FilterQuery } from 'mongoose';
import { AuthMiddleware } from '../../middleware/AuthorizationMiddleware';
import { CreateAttendanceDto, UpdateAttendanceDto } from '../../dto/create-attendance.dto';
import { Attendance, IAttendance } from '../../models/attendance.model';
import { Member } from '../../models/member.model';
import Payment from '../../models/payment.model';

interface ListQueryParams {
    search?: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    fromDate?: string;
    toDate?: string;
    memberId?: string;
    meetingId?: string;
    page?: number;
    limit?: number;
}

@JsonController('/api/admin/attendance')
@UseBefore(AuthMiddleware)
export default class AttendanceController {
    @Post('/')
    async markAttendance(
        @Body() attendanceData: CreateAttendanceDto,
        @Req() req: Request,
        @Res() res: Response
    ) {
        try {
            const meeting = await Payment.findOne({ _id: attendanceData.meetingId });
            if (!meeting) {
                return res.status(404).json({
                    success: false,
                    message: 'Meeting not found',
                });
            }
            const member = await Member.findById(attendanceData.memberId);
            if (!member) {
                return res.status(404).json({
                    success: false,
                    message: 'Member not found',
                });
            }
            const memberChapterId = member.chapterInfo?.chapterId?.toString();
            const hasAccessToMeeting = meeting.chapterId.some(
                (chapterId: any) => chapterId.toString() === memberChapterId
            );

            if (!hasAccessToMeeting) {
                return res.status(403).json({
                    success: false,
                    message: 'You do not have access to this meeting',
                });
            }
            const existingAttendance = await Attendance.findOne({
                memberId: attendanceData.memberId,
                meetingId: attendanceData.meetingId,
                isDelete: 0
            });

            // ✅ EDIT MODE
            if (attendanceData?.from === 'edit') {
                console.log(attendanceData,"eeeee")
                if (!existingAttendance) {
                    return res.status(404).json({
                        success: false,
                        message: 'No existing attendance record found to edit',
                    });
                }
                console.log(attendanceData,"dffffff")
                existingAttendance.status = attendanceData.status || existingAttendance.status;
                existingAttendance.updatedAt = new Date();
                existingAttendance.updatedBy = (req as any).user.id;

                await existingAttendance.save();

                return res.status(200).json({
                    success: true,
                    message: 'Attendance updated successfully',
                    data: existingAttendance,
                });
            }

            // ✅ CREATION MODE (same as before)
            if (existingAttendance) {
                return res.status(400).json({
                    success: false,
                    message: 'Attendance already marked for this meeting',
                });
            }
            // Time validation logic
            const now = new Date();
            const meetingStartTime = new Date(meeting.startDate);
            const meetingEndTime = new Date(meeting.endDate);

            // Calculate time windows
            const earliestMarkTime = new Date(meetingStartTime.getTime() - 2.5 * 60 * 60 * 1000); // 2.5 hours before
            const afterGraceTime = new Date(meetingStartTime.getTime() + 10 * 60 * 1000); // 10 minutes after start
            const finalDeadline = new Date(meetingEndTime.getTime() + 10 * 60 * 60 * 1000); // 10 hour after end

            // Check if current time is within allowed window
            if (now < earliestMarkTime) {
                return res.status(400).json({
                    success: false,
                    message: 'Meeting Attendance not started yet',
                });
            }

            if (now > finalDeadline) {
                return res.status(400).json({
                    success: false,
                    message: 'Attendance cannot be marked anymore. Meeting has ended.',
                });
            }

            if (now >= afterGraceTime && attendanceData.status === 'present') {
                return res.status(400).json({
                    success: false,
                    message: 'Attendance cannot be marked as present anymore. please mark attendance as late',
                });
            }

            const attendance = new Attendance({
                ...attendanceData,
                memberId: attendanceData.memberId,
                status: attendanceData.status,
                createdBy: (req as any).user.id,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const savedAttendance = await attendance.save();

            return res.status(201).json({
                success: true,
                message: 'Attendance marked successfully',
                data: savedAttendance
            });

        } catch (error) {
            console.error('Error marking attendance:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to mark attendance',
            });
        }
    }

    @Get('/')
    async listAttendances(
        @QueryParams() queryParams: ListQueryParams,
        @Res() res: Response,
        @Req() req: Request
    ) {
        const {
            search = '',
            sortField = 'createdAt',
            sortOrder = 'desc',
            fromDate,
            toDate,
            memberId,
            meetingId,
            page = 1,
            limit = 10,
        } = queryParams;

        const skip = (Number(page) - 1) * Number(limit);

        const query: FilterQuery<IAttendance> = {
            isDelete: 0,
        };

        if (memberId) query.memberId = memberId;
        if (meetingId) query.meetingId = meetingId;

        if (search) {
            query.$or = [
                { 'memberId.name': { $regex: search, $options: 'i' } },
                { 'meetingId.topic': { $regex: search, $options: 'i' } },
            ];
        }

        if (fromDate && toDate) {
            query.createdAt = {
                $gte: new Date(fromDate),
                $lte: new Date(toDate),
            };
        }

        try {
            const [records, total] = await Promise.all([
                Attendance.find(query)
                    .populate('memberId', 'personalDetails.firstName personalDetails.lastName personalDetails.profileImage')
                    .populate('meetingId', 'topic date')
                    .sort({ [sortField]: sortOrder === 'asc' ? 1 : -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Attendance.countDocuments(query),
            ]);

            return res.status(200).json({
                success: true,
                data: records,
                message: 'Attendance records fetched successfully',
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            console.error('Error fetching attendance records:', error);
            throw new InternalServerError('Failed to fetch attendance records');
        }
    }

    @Get('/:id')
    async getAttendanceById(
        @Param('id') id: string,
        @Res() res: Response
    ) {
        try {
            const record = await Attendance.findOne({ _id: id, isDelete: 0 })
                .populate('memberId', 'personalDetails.firstName personalDetails.lastName personalDetails.profileImage')
                .populate('meetingId', 'topic date');

            if (!record) {
                return res.status(404).json({
                    success: false,
                    message: 'Attendance record not found',
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Attendance record fetched successfully',
                data: record,
            });
        } catch (error) {
            console.error('Error fetching attendance record:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch attendance record',
            });
        }
    }

    @Get('/meeting/:meetingId')
    async getMeetingAttendance(@Param('meetingId') meetingId: string) {
        try {
            const attendance = await Attendance.find({
                meetingId,
                isDelete: 0,
                isActive: 1,
            })
                .populate('memberId', 'name email mobileNumber')
                .populate('createdBy', 'name');

            return {
                success: true,
                data: attendance,
            };
        } catch (error: unknown) {
            console.error('Error fetching meeting attendance:', error);
            return {
                success: false,
                message: 'Failed to fetch meeting attendance',
                error: error instanceof Error ? error.message : 'An unknown error occurred',
            };
        }
    }

    @Get('/member/:memberId')
    async getMemberAttendance(@Param('memberId') memberId: string) {
        try {
            const attendance = await Attendance.find({
                memberId,
                isDelete: 0,
                isActive: 1,
            })
                .populate('meetingId', 'title date location')
                .populate('createdBy', 'name');

            return {
                success: true,
                data: attendance,
            };
        } catch (error: unknown) {
            console.error('Error fetching member attendance:', error);
            return {
                success: false,
                message: 'Failed to fetch member attendance',
                error: error instanceof Error ? error.message : 'An unknown error occurred',
            };
        }
    }

    @Put('/:id')
    async updateAttendance(
        @Param('id') id: string,
        @Body() updateData: UpdateAttendanceDto,
        @Req() req: Request,
        @Res() res: Response
    ) {
        try {
            const record = await Attendance.findOne({ _id: id, isDelete: 0 });

            if (!record) {
                throw new NotFoundError('Attendance record not found');
            }

            Object.assign(record, {
                ...updateData,
                updatedAt: new Date(),
                updatedBy: (req as any).user.id,
            });

            const updatedRecord = await record.save();

            return res.status(200).json({
                success: true,
                message: 'Attendance record updated successfully',
                data: updatedRecord,
            });
        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            console.error('Error updating attendance record:', error);
            throw new InternalServerError('Failed to update attendance record');
        }
    }

    @Delete('/:id')
    async deleteAttendance(
        @Param('id') id: string,
        @Req() req: Request,
        @Res() res: Response
    ) {
        try {
            const record = await Attendance.findOne({ _id: id, isDelete: 0 });

            if (!record) {
                throw new NotFoundError('Attendance record not found');
            }

            record.isDelete = 1;
            record.deletedAt = new Date();
            record.deletedBy = (req as any).user.id;

            await record.save();

            return res.status(200).json({
                success: true,
                message: 'Attendance record deleted successfully',
            });
        } catch (error) {
            if (error instanceof NotFoundError) throw error;
            console.error('Error deleting attendance record:', error);
            throw new InternalServerError('Failed to delete attendance record');
        }
    }
}
