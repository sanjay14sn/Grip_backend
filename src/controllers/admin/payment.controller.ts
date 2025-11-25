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
import * as QRCode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';
import { AuthMiddleware } from '../../middleware/AuthorizationMiddleware';
import { CreatePaymentDto } from '../../dto/create-payment.dto';
import { Uploads } from '../../utils/uploads/imageUpload';
import Payment, { IPayment } from '../../models/payment.model';
import { ListPaymentDto } from '../../dto/list-payment.dto';

@JsonController('/api/admin/payments')
@UseBefore(AuthMiddleware)
export default class PaymentController {
    @Post('/')
    async createPayment(@Body({ validate: false }) createDto: CreatePaymentDto, @Res() res: Response, @Req() req: Request) {
        // try {
        // const chapters = await Chapter.find({ _id: { $in: createDto.chapterId }, isDelete: 0 });
        // if (chapters.length !== createDto.chapterId.length) {
        //     throw new BadRequestError('One or more specified chapters do not exist.');
        // }
        let imageMeta = null;
        if (req.files && req.files.image) {
            const file = Array.isArray(req.files.image) ? req.files.image[0] : req.files.image;
            imageMeta = (await Uploads.processFiles([file], 'payments', 'img', undefined, ''))[0];
        }

        const payment = new Payment({
            ...createDto,
            image: imageMeta,
            createdBy: (req as any).user.id,
            isActive: 1,
            isDelete: 0,
        });

        const savedPayment = await payment.save();

        try {
            const qrData = JSON.stringify({
                meetingId: savedPayment._id,
                latitude: savedPayment.latitude,
                longitude: savedPayment.longitude,
                startDate: savedPayment.startDate,
                endDate: savedPayment.endDate
            });

            const uploadDir = path.join(process.cwd(), 'public', 'qr-codes');
            // console.log('Creating QR code in directory:', uploadDir);

            try {
                if (!fs.existsSync(uploadDir)) {
                    // console.log('Directory does not exist, creating...');
                    fs.mkdirSync(uploadDir, { recursive: true });
                    console.log('Directory created successfully');
                }

                try {
                    fs.accessSync(uploadDir, fs.constants.W_OK);
                    console.log('Directory is writable');
                } catch (accessErr) {
                    console.error('Directory is not writable:', accessErr);
                    throw new Error('Upload directory is not writable');
                }

                const filename = `qr-${savedPayment._id}-${Date.now()}.png`;
                const filePath = path.join(uploadDir, filename);
                const publicPath = `qr-codes`;

                // console.log('Generating QR code to:', filePath);

                await QRCode.toFile(filePath, qrData, {
                    color: {
                        dark: '#000000',
                        light: '#ffffff'
                    },
                    width: 300,
                    errorCorrectionLevel: 'H'
                });

                console.log('QR code generated successfully');

                if (!fs.existsSync(filePath)) {
                    throw new Error('QR code file was not created');
                }
                savedPayment.qrCode = {
                    docName: filename,
                    docPath: publicPath,
                    originalName: `qr-${savedPayment._id}.png`
                };

                await savedPayment.save();
                console.log('Payment record updated with QR code info');
            } catch (dirError) {
                console.error('Directory/File operation error:', dirError);
                throw dirError;
            }
        } catch (error) {
            console.error('Error generating QR code:', error);
            console.error('QR Code generation failed, but continuing with payment creation');
        }

        return res.status(201).json({
            success: true,
            message: 'Payment record created successfully',
            data: savedPayment
        });
        // } catch (error) {
        //     if (error instanceof BadRequestError) throw error;
        //     throw new InternalServerError('Failed to create Payment record');
        // }
    }

    @Get('/list')
    async listPayments(@QueryParams() queryParams: ListPaymentDto, @Res() res: Response) {
        const { search, sortField = 'createdAt', sortOrder = 'desc', purpose } = queryParams;
        const page = queryParams.page ?? 1;
        const limit = queryParams.limit ?? 100;
        const skip = (page - 1) * limit;

        const query: FilterQuery<IPayment> = { isDelete: 0 };

        if (search) {
            query.$or = [
                { topic: { $regex: search, $options: 'i' } },
                { comments: { $regex: search, $options: 'i' } },
            ];
        }

        if (purpose) {
            query.purpose = purpose;
        }

        try {
            const [records, total] = await Promise.all([
                Payment.find(query)
                    .populate('chapterId', 'chapterName')
                    .populate('createdBy', 'personalDetails.firstName personalDetails.lastName')
                    .sort({ [sortField]: sortOrder === 'asc' ? 1 : -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Payment.countDocuments(query),
            ]);

            return res.status(200).json({
                success: true,
                data: records,
                message: 'Payment records fetched successfully',
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            throw new InternalServerError('Failed to fetch Payment records');
        }
    }

    @Get('/:id')
    async getPaymentById(@Param('id') id: string, @Res() res: Response) {
        const record = await Payment.findOne({ _id: id, isDelete: 0 })
            .populate('chapterId', 'chapterName')
            .populate('createdBy', 'personalDetails.firstName personalDetails.lastName');

        if (!record) {
            throw new NotFoundError('Payment record not found');
        }

        return res.status(200).json({
            success: true,
            message: 'Payment record fetched successfully',
            data: record
        });
    }

    @Put('/:id')
    async updatePayment(
        @Param('id') id: string,
        @Body() body: Partial<CreatePaymentDto>,
        @Res() res: Response,
        @Req() req: Request
    ) {
        const record = await Payment.findOne({ _id: id, isDelete: 0 });

        if (!record) {
            throw new NotFoundError('Payment record not found');
        }

        // Store original values to check if we need to regenerate QR code
        const originalValues = {
            startDate: record.startDate,
            endDate: record.endDate,
            latitude: record.latitude,
            longitude: record.longitude
        };
        const isMeetingPurpose = body.purpose === 'meeting';

        if (!isMeetingPurpose && req.files && req.files.image) {
            const file = Array.isArray(req.files.image) ? req.files.image[0] : req.files.image;
            const imageMeta = (await Uploads.processFiles([file], 'payments', 'img', undefined, ''))[0];
            body.image = imageMeta;
        }
        if (typeof body.image === 'string' && body.image === 'null') {
            delete body.image;
        }

        Object.assign(record, body);
        record.updatedBy = (req as any).user.id;

        try {
            const updatedRecord = await record.save();

            // Check if any of the QR code related fields were updated
            const qrCodeNeedsUpdate =
                originalValues.startDate.getTime() !== updatedRecord.startDate.getTime() ||
                originalValues.endDate.getTime() !== updatedRecord.endDate.getTime() ||
                originalValues.latitude !== updatedRecord.latitude ||
                originalValues.longitude !== updatedRecord.longitude;

            if (qrCodeNeedsUpdate) {
                try {
                    const qrData = JSON.stringify({
                        meetingId: updatedRecord._id,
                        latitude: updatedRecord.latitude,
                        longitude: updatedRecord.longitude,
                        startDate: updatedRecord.startDate,
                        endDate: updatedRecord.endDate
                    });

                    const uploadDir = path.join(process.cwd(), 'public', 'qr-codes');

                    // Create directory if it doesn't exist
                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                    }

                    // Generate new filename
                    const filename = `qr-${updatedRecord._id}-${Date.now()}.png`;
                    const filePath = path.join(uploadDir, filename);
                    const publicPath = `qr-codes`;

                    // Generate new QR code
                    await QRCode.toFile(filePath, qrData, {
                        color: {
                            dark: '#000000',
                            light: '#ffffff'
                        },
                        width: 300,
                        errorCorrectionLevel: 'H'
                    });

                    // Update payment with new QR code info
                    updatedRecord.qrCode = {
                        docName: filename,
                        docPath: publicPath,
                        originalName: `qr-${updatedRecord._id}.png`
                    };

                    await updatedRecord.save();
                    console.log('QR code updated successfully');
                } catch (error) {
                    console.error('Error updating QR code:', error);
                    // Don't fail the request if QR code update fails
                }
            }

            return res.status(200).json({
                success: true,
                message: 'Payment updated successfully',
                data: updatedRecord
            });
        } catch (error) {
            throw new InternalServerError('Failed to update Payment record');
        }
    }

    @Delete('/:id')
    async deletePayment(@Param('id') id: string, @Res() res: Response, @Req() req: Request) {
        const record = await Payment.findOne({ _id: id, isDelete: 0 });

        if (!record) {
            throw new NotFoundError('Payment record not found');
        }

        record.isDelete = 1;
        record.deletedAt = new Date();
        record.deletedBy = (req as any).user.id;

        try {
            await record.save();
            return res.status(200).json({
                success: true,
                message: 'Payment record deleted successfully'
            });
        } catch (error) {
            throw new InternalServerError('Failed to delete Payment record');
        }
    }
}