import mongoose from 'mongoose';
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
import { Visitor, IVisitor } from '../../models/visitor.model';
import { CreateVisitorDto } from '../../dto/create-visitor.dto';
import { ListVisitorDto } from '../../dto/list-visitor.dto';
import { FilterQuery } from 'mongoose';
import { AuthMiddleware } from '../../middleware/AuthorizationMiddleware';
import { Member } from "../../models/member.model";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit"; // For generating PDF
import streamBuffers from "stream-buffers"; // To send PDF as buffer

@JsonController('/api/mobile/visitors')
@UseBefore(AuthMiddleware)
export default class VisitorController {
    @Post('/')
    async createVisitor(
        @Body({ validate: true }) createDto: CreateVisitorDto,
        @Res() res: Response,
        @Req() req: Request
    ) {
        try {
            const visitor = new Visitor({
                ...createDto,

                // Default metadata
                isActive: 1,
                isDelete: 0,
                status: 'approve',
                createdAt: new Date(),
                updatedAt: new Date(),

                // Who created the form (admin / logged-in user)
                createdBy: (req as any)?.user?.id || null,

                // IMPORTANT: Who actually invited the visitor (member ID from frontend)
                invitedBy: createDto.invitedBy || (req as any)?.user?.id || null,
            });

            const savedVisitor = await visitor.save();

            const visitorEmail = savedVisitor.email; // Make sure visitor object has email

            // ---- Nodemailer Transporter ----
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: "gripbusinessforum@gmail.com",
                    pass: process.env.MAIL_PASSWORD,
                },
            });

            // -----------------------------
            // 1️⃣ Thank You Email
            // -----------------------------
            const thankYouMessage = `
Hello ${savedVisitor.name},

Thank you for visiting Grip Forum. We appreciate your time and hope you had a great experience.

Regards,
Grip Forum Team
`;

            await transporter.sendMail({
                from: `"Grip Forum" <gripbusinessforum@gmail.com>`,
                to: visitorEmail,
                subject: "Thank You for Visiting Grip Forum",
                text: thankYouMessage,
            });

            // -----------------------------
            // 2️⃣ Email with PDF
            // -----------------------------
            // Generate PDF in memory
            // Generate PDF in memory
            const doc = new PDFDocument();
            const bufferStream = new streamBuffers.WritableStreamBuffer({
                initialSize: 1024,
                incrementAmount: 1024,
            });

            doc.pipe(bufferStream);

            doc.fontSize(16).text("Visitor Details", { underline: true });
            doc.moveDown();
            doc.fontSize(12).text(`Name       : ${savedVisitor.name}`);
            doc.fontSize(12).text(`From       : ${createDto.invited_from}`);
            doc.text(`Category   : ${savedVisitor.category}`);
            doc.text(`Company    : ${savedVisitor.company}`);
            doc.text(`Mobile     : ${savedVisitor.mobile}`);
            doc.text(`Invited By : ${savedVisitor.invitedBy}`);
            doc.text(`Created At : ${savedVisitor.createdAt.toISOString()}`);
            doc.end();

            const pdfMailMessage = `

Please find attached  visitor details from Grip Forum.

Regards,
Grip Forum Team
`;

            // Wait for PDF buffer
            await new Promise<void>((resolve) => bufferStream.on("finish", resolve));

            // Get the buffer safely
            const pdfBuffer = bufferStream.getContents();
            if (!pdfBuffer) {
                throw new Error("Failed to generate PDF buffer");
            }

            // Now send the email
            await transporter.sendMail({
                from: `"Grip Forum" <gripbusinessforum@gmail.com>`,
                to: `"Grip Forum" <gripbusinessforum@gmail.com>`,
                subject: "Visitor Details",
                text: pdfMailMessage,
                attachments: [
                    {
                        filename: "VisitorDetails.pdf",
                        content: pdfBuffer, // ✅ TypeScript now sees this as Buffer
                    },
                ],
            });


            return res.status(201).json({
                success: true,
                message: 'Visitor created successfully',
                data: savedVisitor,
            });
        } catch (error) {
            console.error('Error creating visitor:', error);
            throw new InternalServerError('Failed to create Visitor record');
        }
    }

    @Get('/list')
    async listVisitors(@QueryParams() queryParams: ListVisitorDto, @Res() res: Response, @Req() req: Request) {
        const page = Number(queryParams.page) || 1;
        const limit = Number(queryParams.limit) || 100;
        const skip = (page - 1) * limit;

        const { search, sortField = 'createdAt', sortOrder = 'desc', fromDate, toDate } = queryParams;


        const query: FilterQuery<IVisitor> = {
            isDelete: 0,
            invitedBy: new mongoose.Types.ObjectId((req as any).user.id)
        };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { company: { $regex: search, $options: 'i' } },
            ];
        }

        if (fromDate && toDate) {
            const start = new Date(fromDate);
            start.setHours(0, 0, 0, 0);

            const end = new Date(toDate);
            end.setDate(end.getDate() + 1);
            end.setHours(0, 0, 0, 0);

            query.createdAt = {
                $gte: start,
                $lt: end
            };
        }

        try {
            console.log(query)
            const [records, total] = await Promise.all([
                Visitor.aggregate([
                    { $match: query },
                    { $sort: { [sortField]: sortOrder === 'asc' ? 1 : -1 } },
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $lookup: {
                            from: 'members',
                            localField: 'invitedBy',
                            foreignField: '_id',
                            as: 'invitedBy',
                            pipeline: [
                                { $project: { 'personalDetails.firstName': 1, 'personalDetails.lastName': 1, 'personalDetails.profileImage': 1, 'personalDetails.companyName': 1 } }
                            ]
                        }
                    },
                    {
                        $unwind: {
                            path: '$invitedBy',
                            preserveNullAndEmptyArrays: true
                        }
                    }
                ]),
                Visitor.countDocuments(query),
            ]);

            return res.status(200).json({
                success: true,
                data: records,
                message: 'Visitor records fetched successfully',
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                }
            });
        } catch (error) {
            throw new InternalServerError('Failed to fetch Visitor records');
        }
    }

    @Get('/list/:userId')
    async listVisitorsByUserId(
        @Param('userId') userId: string,
        @QueryParams() queryParams: ListVisitorDto,
        @Res() res: Response,
    ) {
        const { page = 1, limit = 10, search, sortField = 'createdAt', sortOrder = 'desc' } = queryParams;
        const skip = (page - 1) * limit;

        const query: FilterQuery<IVisitor> = {
            isDelete: 0,
            invitedBy: new mongoose.Types.ObjectId(userId)
        };

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { company: { $regex: search, $options: 'i' } },
            ];
        }

        try {
            const [records, total] = await Promise.all([
                Visitor.aggregate([
                    { $match: query },
                    { $sort: { [sortField]: sortOrder === 'asc' ? 1 : -1 } },
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $lookup: {
                            from: 'members',
                            localField: 'invitedBy',
                            foreignField: '_id',
                            as: 'invitedBy',
                            pipeline: [
                                { $project: { 'personalDetails.firstName': 1, 'personalDetails.lastName': 1, 'personalDetails.profileImage': 1, 'personalDetails.companyName': 1 } }
                            ]
                        }
                    },
                    {
                        $unwind: {
                            path: '$invitedBy',
                            preserveNullAndEmptyArrays: true
                        }
                    }
                ]),
                Visitor.countDocuments(query),
            ]);

            return res.status(200).json({
                success: true,
                data: records,
                message: 'Visitor records fetched successfully',
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            throw new InternalServerError('Failed to fetch Visitor records');
        }
    }

    @Get('/:id')
    async getVisitorById(@Param('id') id: string, @Res() res: Response) {
        const aggResult = await Visitor.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(id), isDelete: 0 } },
            {
                $lookup: {
                    from: 'members',
                    localField: 'invitedBy',
                    foreignField: '_id',
                    as: 'invitedBy',
                    pipeline: [
                        { $project: { 'personalDetails.firstName': 1, 'personalDetails.lastName': 1, 'personalDetails.profileImage': 1, 'personalDetails.companyName': 1 } }
                    ]
                }
            },
            {
                $unwind: {
                    path: '$invitedBy',
                    preserveNullAndEmptyArrays: true
                }
            }
        ]);
        const record = aggResult[0];

        if (!record) {
            throw new NotFoundError('Visitor record not found');
        }

        return res.status(200).json({ success: true, message: 'Visitor record fetched successfully', data: record });
    }

    @Put('/:id')
    async updateVisitor(@Param('id') id: string, @Body() body: Partial<CreateVisitorDto>, @Res() res: Response, @Req() req: Request) {
        const record = await Visitor.findOne({ _id: id, isDelete: 0 });

        if (!record) {
            throw new NotFoundError('Visitor record not found');
        }

        Object.assign(record, body);
        record.updatedAt = new Date();
        record.updatedBy = (req as any).user.id;

        try {
            const updatedRecord = await record.save();
            return res.status(200).json({ success: true, message: 'Visitor updated successfully', data: updatedRecord });
        } catch (error) {
            throw new InternalServerError('Failed to update Visitor record');
        }
    }

    @Delete('/:id')
    async deleteVisitor(@Param('id') id: string, @Res() res: Response, @Req() req: Request) {
        const record = await Visitor.findById(id);

        if (!record) {
            throw new NotFoundError('Visitor record not found');
        }

        record.isDelete = 1;
        record.deletedAt = new Date();
        record.deletedBy = (req as any).user.id;

        try {
            await record.save();
            return res.status(200).json({ success: true, message: 'Visitor record deleted successfully' });
        } catch (error) {
            throw new InternalServerError('Failed to delete Visitor record');
        }
    }

    @Get('/chapter/:chapterId/lastSevenDays')
    async getVisitorsForChapterLastSevenDays(
        @Param('chapterId') chapterId: string,
        @Res() res: Response
    ) {
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const visitors = await Member.aggregate([
                {
                    $match: { 'chapterInfo.chapterId': new mongoose.Types.ObjectId(chapterId) }
                },
                {
                    $lookup: {
                        from: 'visitors',
                        localField: '_id',
                        foreignField: 'invitedBy',
                        as: 'invitedVisitors'
                    }
                },
                {
                    $unwind: '$invitedVisitors'
                },
                {
                    $match: { 'invitedVisitors.createdAt': { $gte: sevenDaysAgo } }
                },
                {
                    $project: {
                        _id: '$invitedVisitors._id',
                        name: '$invitedVisitors.name',
                        company: '$invitedVisitors.company',
                        category: '$invitedVisitors.category',
                        mobile: '$invitedVisitors.mobile',
                        email: '$invitedVisitors.email',
                        address: '$invitedVisitors.address',
                        visitDate: '$invitedVisitors.visitDate',
                        status: '$invitedVisitors.status',
                        createdAt: '$invitedVisitors.createdAt',
                        invitedBy: {
                            _id: '$invitedVisitors.invitedBy',
                            name: { $concat: ['$personalDetails.firstName', ' ', '$personalDetails.lastName'] },
                            profileImage: '$personalDetails.profileImage',
                            companyName: '$personalDetails.companyName'
                        }
                    }
                }
            ]);

            return res.status(200).json({
                success: true,
                message: 'Visitors from last 7 days for chapter fetched successfully',
                data: visitors
            });

        } catch (error) {
            console.error(`Error fetching visitors for chapter ${chapterId}:`, error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch visitors',
                error: error instanceof Error ? error.message : 'An unknown error occurred'
            });
        }
    }
}
