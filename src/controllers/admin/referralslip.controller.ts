import {
    JsonController,
    Get,
    Body,
    Param,
    QueryParams,
    Res,
    Req,
    UseBefore,
    NotFoundError,
    InternalServerError,
    Patch,
    BadRequestError,
} from "routing-controllers";
import { Request, Response } from "express";
import mongoose, { FilterQuery } from "mongoose";
import { AuthMiddleware } from "../../middleware/AuthorizationMiddleware";
import { ListReferralSlipDto } from "../../dto/list-referralslip.dto";
import { ReferralSlipModel, IReferralSlip } from "../../models/referralslip.model";
import { Chapter, IChapter } from '../../models/chapter.model';
import { Member } from '../../models/member.model';
import { UpdateStatusDto2 } from "../../dto/update-status.dto";

@JsonController("/api/admin/referralslip")
@UseBefore(AuthMiddleware)
export default class ReferralSlipController {

    @Get('/list')
    async listReferralSlip(@QueryParams() queryParams: ListReferralSlipDto, @Res() res: Response, @Req() req: Request) {
        const { page = 1, limit = 10 } = queryParams;
        //   const skip = (page - 1) * limit;

        try {
            // Get all chapters
            const filter: FilterQuery<IChapter> = { isDelete: 0 };
            const chapters = await Chapter.find(filter).lean();

            // Prepare the final response array
            const responseData = [];

            for (const chapter of chapters) {
                // Get all members for this chapter
                const members = await Member.find({
                    'chapterInfo.chapterId': chapter._id,
                    isDelete: 0
                }).lean();

                // Format members with basic info
                const formattedMembers = members.map(member => ({
                    id: member._id,
                    name: `${member.personalDetails?.firstName || ''} ${member.personalDetails?.lastName || ''}`.trim(),
                    companyName: member.personalDetails?.companyName || '',
                    category: member.personalDetails?.categoryRepresented || '',
                    mobile: member.contactDetails?.mobileNumber || '',
                    profileImage: member.personalDetails.profileImage || {
                        docName: '',
                        docPath: '',
                        originalName: ''
                    },
                    status: member.status,
                    totalCount: 0 // Initialize count to 0
                }));

                // Get all one-to-one records for this chapter's members
                const oneToOneQuery: FilterQuery<IReferralSlip> = {
                    isDelete: 0,
                    $or: [
                        { fromMember: { $in: members.map(m => m._id) } },
                        { toMember: { $in: members.map(m => m._id) } }
                    ]
                };

                const oneToOneRecords = await ReferralSlipModel.find(oneToOneQuery).lean();

                // Calculate one-to-one count for each member
                const memberCountMap = new Map<string, number>();

                // Initialize all member counts to 0
                formattedMembers.forEach(member => {
                    memberCountMap.set(String(member.id), 0);
                });

                // Count interactions for each member
                oneToOneRecords.forEach(record => {
                    if (record.fromMember && memberCountMap.has(String(record.fromMember))) {
                        memberCountMap.set(String(record.fromMember), memberCountMap.get(String(record.fromMember))! + 1);
                    }
                    if (record.toMember && memberCountMap.has(String(record.toMember))) {
                        memberCountMap.set(String(record.toMember), memberCountMap.get(String(record.toMember))! + 1);
                    }
                });

                // Update member counts in the formatted members array
                const membersWithCounts = formattedMembers.map(member => ({
                    ...member,
                    totalCount: memberCountMap.get(String(member.id)) || 0
                }));

                // Calculate TOTAL sum of all individual counts (what you want as overallChapterCount)
                const sumOfAllMemberCounts = membersWithCounts.reduce((sum, member) => sum + member.totalCount, 0);

                // Sort members by one-to-one count (descending) and take top 5
                const topMembers = membersWithCounts
                    .sort((a, b) => b.totalCount - a.totalCount)
                    .slice(0, 5);

                // If no one-to-one records, just take first 5 members
                const finalMembers = sumOfAllMemberCounts > 0
                    ? topMembers
                    : formattedMembers.slice(0, 5);

                // Add chapter data to response
                responseData.push({
                    chapterId: chapter._id,
                    chapterName: chapter.chapterName,
                    overallChapterCount: sumOfAllMemberCounts, // Now shows the sum of all individual counts
                    members: finalMembers
                });
            }

            return res.status(200).json({
                success: true,
                message: 'ReferralSlip records fetched successfully',
                data: responseData,
                pagination: {
                    total: responseData.length,
                    page,
                    limit
                },
            });
        } catch (error) {
            console.error('Error fetching ReferralSlip records:', error);
            throw new InternalServerError('Failed to fetch ReferralSlip records');
        }
    }

    @Get("/member/list/:id")
    async listReferralSlipMembers(
        @Param("id") id: string,
        @Req() req: Request,
        @QueryParams() queryParams: ListReferralSlipDto,
        @Res() res: Response
    ) {
        try {
            // --- Ensure page and limit are numbers (avoid string | number unions) ---
            const page = Number(queryParams?.page ?? 1);
            const limit = Number(queryParams?.limit ?? 10);

            // sanitize
            const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
            const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10;
            const skip = Math.max(0, (safePage - 1) * safeLimit);

            // --- verify chapter exists ---
            const chapter = await Chapter.findOne({
                _id: id,
                isDelete: 0
            })
                .populate('zoneId', 'zoneName')
                .populate('cidId', 'name email');

            if (!chapter) {
                return res.status(404).json({
                    success: false,
                    message: 'Chapter not found'
                });
            }

            // --- get all members in chapter (lean for performance) ---
            const members = await Member.find({
                'chapterInfo.chapterId': id,
                isActive: 1,
                isDelete: 0
            }).lean();

            const memberIds = members.map(member => member._id);

            // --- prepare query for referral slips ---
            const query: FilterQuery<IReferralSlip> = {
                isDelete: 0,
                $or: [
                    { fromMember: { $in: memberIds } },
                    { toMember: { $in: memberIds } }
                ]
            };

            // --- types for populated member shape so TS knows the fields exist after populate ---
            interface PopulatedMember {
                _id: mongoose.Types.ObjectId | string;
                personalDetails?: {
                    firstName?: string;
                    lastName?: string;
                    profileImage?: {
                        docName?: string;
                        docPath?: string;
                        originalName?: string;
                    } | null;
                };
                contactDetails?: {
                    mobileNumber?: string;
                };
            }

            type ReferralSlipLean = {
                _id: mongoose.Types.ObjectId | string;
                referalDetail?: any;
                fromMember?: PopulatedMember | mongoose.Types.ObjectId | null;
                toMember?: PopulatedMember | mongoose.Types.ObjectId | null;
                createdAt?: Date;
                status?: string;
            };

            // --- fetch paginated records + total count in parallel ---
            const [records, total] = await Promise.all([
                ReferralSlipModel.find(query)
                    .populate<{ fromMember: PopulatedMember }>('fromMember', 'personalDetails contactDetails')
                    .populate<{ toMember: PopulatedMember }>('toMember', 'personalDetails contactDetails')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(safeLimit)
                    .lean<ReferralSlipLean[]>(),
                ReferralSlipModel.countDocuments(query)
            ]);

            // --- format results safely (handle case where member wasn't populated) ---
            const formattedRecords = (records || []).map(record => {
                const from = record.fromMember as PopulatedMember | undefined | null;
                const to = record.toMember as PopulatedMember | undefined | null;

                const fromName = from
                    ? `${(from.personalDetails?.firstName || '').trim()} ${(from.personalDetails?.lastName || '').trim()}`.trim()
                    : '';

                const toName = to
                    ? `${(to.personalDetails?.firstName || '').trim()} ${(to.personalDetails?.lastName || '').trim()}`.trim()
                    : '';

                return {
                    _id: record._id,
                    referalDetails: record.referalDetail,
                    fromMember: {
                        id: from?._id ?? null,
                        name: fromName,
                        mobile: from?.contactDetails?.mobileNumber ?? '',
                        profileImage: from?.personalDetails?.profileImage ?? null
                    },
                    toMember: {
                        id: to?._id ?? null,
                        name: toName,
                        mobile: to?.contactDetails?.mobileNumber ?? '',
                        profileImage: to?.personalDetails?.profileImage ?? null
                    },
                    createdAt: record.createdAt,
                    status: record.status
                };
            });

            // --- safe totalPages calculation (avoid division by zero) ---
            const totalPages = Math.max(1, Math.ceil(total / (safeLimit || 1)));

            return res.status(200).json({
                success: true,
                message: 'ReferralSlip members records fetched successfully',
                data: {
                    chapter: {
                        _id: chapter._id,
                        chapterName: chapter.chapterName,
                        zoneName: (chapter.zoneId as any)?.zoneName,
                        cidName: (chapter.cidId as any)?.name,
                        memberCount: members.length
                    },
                    records: formattedRecords,
                    pagination: {
                        total,
                        page: safePage,
                        limit: safeLimit,
                        totalPages
                    }
                }
            });

        } catch (error) {
            console.error("Error fetching ReferralSlip records:", error);
            throw new InternalServerError("Failed to fetch ReferralSlip records");
        }
    }


    @Patch('/status/:id')
    async updateStatus(
        @Param('id') id: string,
        @Body({ validate: true }) body: UpdateStatusDto2,
        @Res() res: Response
    ) {
        try {
            const referralSlipRecord = await ReferralSlipModel.findById(id);

            if (!referralSlipRecord) {
                throw new NotFoundError('Referral slip record not found');
            }

            referralSlipRecord.status = body.status;
            await referralSlipRecord.save();

            return res.status(200).json({
                success: true,
                message: 'Status updated successfully',
                data: referralSlipRecord,
            });
        } catch (error: unknown) {
            console.error('Error updating status:', error);
            if (error instanceof NotFoundError || error instanceof BadRequestError) {
                throw error;
            }
            return res.status(500).json({
                success: false,
                message: 'Failed to update status',
            });
        }
    }

    @Patch('/delete/:id')
    async softDeleteReferralSlip(
        @Param('id') id: string,
        @Res() res: Response
    ) {
        try {
            // Check if the record exists
            const referralSlipRecord = await ReferralSlipModel.findById(id);

            if (!referralSlipRecord) {
                throw new NotFoundError('Referral slip record not found');
            }

            // Update the isDelete flag
            referralSlipRecord.isDelete = 1;
            referralSlipRecord.updatedAt = new Date();

            await referralSlipRecord.save();

            return res.status(200).json({
                success: true,
                message: 'Referral slip deleted successfully (soft delete)',
                data: referralSlipRecord,
            });
        } catch (error: unknown) {
            console.error('Error soft deleting referral slip:', error);

            if (error instanceof NotFoundError || error instanceof BadRequestError) {
                throw error;
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to delete referral slip',
            });
        }
    }
}
