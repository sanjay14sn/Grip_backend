import {
    JsonController,
    Post,
    Get,
    Body,
    Param,
    Res,
    UseBefore,
    Req,
} from 'routing-controllers';
import { Request, Response } from 'express';
import { AuthMiddleware } from '../../middleware/AuthorizationMiddleware';
import { CreateAttendanceDto } from '../../dto/create-attendance.dto';
import { Attendance } from '../../models/attendance.model';
import { Member } from '../../models/member.model';
import Payment from '../../models/payment.model';
import mongoose, { Types } from 'mongoose';
import { ObjectId } from 'mongodb';

@JsonController('/api/mobile/attendance')
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
            const member = await Member.findById((req as any).user.id);
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
                memberId: (req as any).user.id,
                meetingId: attendanceData.meetingId,
                isDelete: 0
            });

            if (existingAttendance) {
                return res.status(400).json({
                    success: false,
                    message: 'Attendance already marked for this meeting',
                });
            }
            const now = new Date();
            const meetingStartTime = new Date(meeting.startDate);

            // Calculate time windows
            const earliestMarkTime = new Date(meetingStartTime.getTime() - 2.5 * 60 * 60 * 1000); // 2.5 hours before
            const afterGraceTime = new Date(meetingStartTime.getTime() + 10 * 60 * 1000); // 10 minutes after start
            const finalDeadline = new Date(meetingStartTime.getTime() + 30 * 60 * 1000); // 30 minutes after start

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

            // Determine status based on time
            let status = 'present';
            if (now >= afterGraceTime) {
                status = 'late';
            }
            const attendance = new Attendance({
                ...attendanceData,
                memberId: (req as any).user.id,
                status: status,
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

    @Get('/bymemberId/:memberId')
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

    @Get('/attendanceDetailsByMemberId/:memberId')
    async getAttendanceDetailsByMemberId(@Param('memberId') memberId: string) {
        try {
            const today = new Date();

            const data = await Member.aggregate(
                [
                    {
                        $match: {
                            _id: {
                                $eq: new ObjectId(memberId)
                            },
                            isDelete: 0,
                            isActive: 1
                        }
                    },
                    {
                        $project: {
                            chapterId: "$chapterInfo.chapterId"
                        }
                    },
                    {
                        $lookup: {
                            from: "payments",
                            let: {
                                chapterId: "$chapterId"
                            },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                {
                                                    $eq: [
                                                        "$chapterId",
                                                        "$chapterId"
                                                    ]
                                                },
                                                {
                                                    $gt: [
                                                        "$startDate",
                                                        today
                                                    ]
                                                },
                                                {
                                                    $eq: ["$isDelete", 0]
                                                },
                                                {
                                                    $eq: ["$isActive", 1]
                                                }
                                            ]
                                        }
                                    }
                                },
                                {
                                    $limit: 1
                                },
                                {
                                    $addFields: {
                                        _id: { $toString: "$_id" }, // Convert ObjectId to string
                                        chapterId: {
                                            $map: { // Convert array of ObjectIds to strings
                                                input: "$chapterId",
                                                as: "id",
                                                in: { $toString: "$$id" }
                                            }
                                        },
                                        createdBy: { $toString: "$createdBy" }, // Convert createdBy
                                        updatedBy: {
                                            $ifNull: [ // Convert updatedBy if it exists
                                                { $toString: "$updatedBy" },
                                                null
                                            ]
                                        }
                                    }
                                }
                            ],
                            as: "upcomingMeetings"
                        }
                    },
                    {
                        $lookup: {
                            from: "attendances",
                            let: {
                                memberId: "$_id"
                            },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $eq: ["$memberId", "$$memberId"]
                                        },
                                        isDelete: 0,
                                        isActive: 1
                                    }
                                },
                                {
                                    $group: {
                                        _id: "$status",
                                        count: {
                                            $sum: 1
                                        }
                                    }
                                }
                            ],
                            as: "attendanceStatus"
                        }
                    },
                    {
                        $project: {
                            upcomingMeetings: 1,
                            attendanceStatus: 1,
                            _id: 0
                        }
                    }
                ]);

            return {
                success: true,
                data: data
            };
        } catch (error: unknown) {
            console.error('Error fetching attendance details:', error);
            return {
                success: false,
                message: 'Failed to fetch attendance details',
                error: error instanceof Error ? error.message : 'An unknown error occurred',
            };
        }
    }
}
