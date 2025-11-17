import {
    JsonController,
    Get,
    Req,
    Res,
    UseBefore,
    InternalServerError,
} from 'routing-controllers';
import { Request, Response } from 'express';
import { AuthMiddleware } from '../../middleware/AuthorizationMiddleware';
import { TestimonialSlip } from '../../models/testimonialslip.model';
import ThankYouSlip from '../../models/thankyouslip.model';
import { Visitor } from '../../models/visitor.model';
import { OneToOne } from '../../models/onetoone.model';
import { ReferralSlipModel } from '../../models/referralslip.model';
import mongoose from 'mongoose';

@JsonController('/api/mobile/dashboard')
@UseBefore(AuthMiddleware)
export default class DashboardController {
    @Get('/count-summary')
    async getCountSummary(@Req() req: Request, @Res() res: Response) {
        try {
            const memberId = (req as any).user?.id;
            if (!memberId) {
                return res.status(401).json({
                    success: false,
                    message: 'Unauthorized: No member info found.'
                });
            }

            // Get filterType from query, default to 'overall'
            const filterType = (req.query.filterType as string) || 'overall';

            // Compute date range based on filterType
            let startDate: Date | null = null;
            let endDate: Date = new Date(); // current time
            const now = new Date();
            if (filterType === 'this-week') {
                const day = now.getDay(); // 0 (Sun) - 6 (Sat)
                const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
                startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
            } else if (filterType === 'this-month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            } else if (filterType === '3-months') {
                startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
            } else if (filterType === '6-months') {
                startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
            } else if (filterType === '12-months') {
                startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1, 0, 0, 0, 0);
            } else {
                startDate = null; // overall
            }

            // Build date filter for Mongo queries
            let dateFilter = {};
            if (startDate) {
                dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };
            }

            // Build status filter for specific timeframes
            let statusFilter = {};
            if (['this-month', '3-months', '6-months', '12-months'].includes(filterType)) {
                statusFilter = { status: 'approve' };
            } else if (filterType === 'overall') {
                statusFilter = { status: { $ne: 'reject' } };
            }

            const memberObjectId = new mongoose.Types.ObjectId(memberId);

            const [
                testimonialGivenCount,
                referralGivenCount,
                thankYouGivenAmountResult,
                thankYouGivenCount,
                testimonialReceivedCount,
                referralReceivedCount,
                thankYouReceivedAmountResult,
                thankYouReceivedCount,
                visitorCount,
                oneToOneCount,
            ] = await Promise.all([
                TestimonialSlip.countDocuments({
                    fromMember: memberObjectId,
                    isActive: 1,
                    isDelete: 0,
                    ...dateFilter,
                    ...statusFilter
                }),
                ReferralSlipModel.countDocuments({
                    fromMember: memberObjectId,
                    isActive: 1,
                    isDelete: 0,
                    ...dateFilter,
                    ...statusFilter
                }),
                ThankYouSlip.aggregate([
                    {
                        $match: {
                            fromMember: memberObjectId,
                            isActive: 1,
                            isDelete: 0,
                            ...(startDate ? { createdAt: { $gte: startDate, $lte: endDate } } : {}),
                            ...statusFilter
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: "$amount" }
                        }
                    }
                ]),
                ThankYouSlip.countDocuments({
                    fromMember: memberObjectId,
                    isActive: 1,
                    isDelete: 0,
                    ...dateFilter,
                    ...statusFilter
                }),
                TestimonialSlip.countDocuments({
                    toMember: memberObjectId,
                    isActive: 1,
                    isDelete: 0,
                    ...dateFilter,
                    ...statusFilter
                }),
                ReferralSlipModel.countDocuments({
                    toMember: memberObjectId,
                    isActive: 1,
                    isDelete: 0,
                    ...dateFilter,
                    ...statusFilter
                }),
                ThankYouSlip.aggregate([
                    {
                        $match: {
                            toMember: memberObjectId,
                            isActive: 1,
                            isDelete: 0,
                            ...(startDate ? { createdAt: { $gte: startDate, $lte: endDate } } : {}),
                            ...statusFilter
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: "$amount" }
                        }
                    }
                ]),
                ThankYouSlip.countDocuments({
                    fromMember: memberObjectId,
                    isActive: 1,
                    isDelete: 0,
                    ...dateFilter,
                    ...statusFilter
                }),
                Visitor.countDocuments({
                    invitedBy: memberObjectId,
                    isActive: 1,
                    isDelete: 0,
                    ...dateFilter,
                    ...statusFilter
                }),
                OneToOne.countDocuments({
                    $or: [
                        { fromMember: memberObjectId },
                        { toMember: memberObjectId }
                    ],
                    isActive: 1,
                    isDelete: 0,
                    ...dateFilter,
                    ...statusFilter
                }),
            ]);
            const thankYouGivenAmount = thankYouGivenAmountResult[0]?.total || 0;
            const thankYouReceivedAmount = thankYouReceivedAmountResult[0]?.total || 0;

            return res.json({
                data: {
                    testimonialGivenCount,
                    referralGivenCount,
                    thankYouGivenAmount,
                    thankYouGivenCount,
                    testimonialReceivedCount,
                    referralReceivedCount,
                    thankYouReceivedAmount,
                    thankYouReceivedCount,
                    visitorCount,
                    oneToOneCount
                }
            });

        } catch (error) {
            console.error('Dashboard error:', error);
            throw new InternalServerError('Failed to fetch dashboard summary');
        }
    }
}