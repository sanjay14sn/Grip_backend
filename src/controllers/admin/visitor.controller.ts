import mongoose from 'mongoose';
import {
    JsonController,
    Get,
    Body,
    Param,
    QueryParams,
    Res,
    NotFoundError,
    InternalServerError,
    Req,
    Patch,
    UseBefore,
} from 'routing-controllers';
import { Request, Response } from 'express';
import { Visitor, IVisitor } from '../../models/visitor.model';
import { ListVisitorDto } from '../../dto/list-visitor.dto';
import { FilterQuery } from 'mongoose';
import { Chapter, IChapter } from '../../models/chapter.model';
import { Member } from '../../models/member.model';
import { UpdateStatusDto2 } from '../../dto/update-status.dto';
import { AuthMiddleware } from '../../middleware/AuthorizationMiddleware';

@JsonController('/api/admin/visitors')
@UseBefore(AuthMiddleware)
export default class VisitorController {

 

    @Get('/list')
    async listVisitors(@QueryParams() queryParams: ListVisitorDto, @Res() res: Response, @Req() req: Request) {
        const { page = 1, limit = 10, search, sortField = 'createdAt', sortOrder = 'desc' } = queryParams;
        const skip = (page - 1) * limit;

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
                    profileImage: member.personalDetails?.profileImage || {
                        docName: '',
                        docPath: '',
                        originalName: ''
                    },
                    totalCount: 0,
                    status: member.status, // Initialize visitor count to 0
                }));

                // Get all visitor records for this chapter's members
                const visitorQuery: FilterQuery<IVisitor> = {
                    isDelete: 0,
                    invitedBy: { $in: members.map(m => m._id) }
                };

                const visitorRecords = await Visitor.find(visitorQuery).lean();

                // Count visitors for each member
                const visitorCounts = visitorRecords.reduce((acc, visitor) => {
                    const memberId = String(visitor.invitedBy);
                    acc[memberId] = (acc[memberId] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                // Update member counts in the formatted members array
                const membersWithCounts = formattedMembers.map(member => ({
                    ...member,
                    visitorCount: visitorCounts[String(member.id)] || 0
                }));

                // Calculate TOTAL visitors for this chapter (sum of all member visitor counts)
                const totalChapterVisitors = membersWithCounts.reduce((sum, member) => sum + member.visitorCount, 0);

                // Sort members by visitor count (descending) and take top 5
                const topMembers = membersWithCounts
                    .sort((a, b) => b.visitorCount - a.visitorCount)
                    .slice(0, 5);

                // If no visitor records, just take first 5 members
                const finalMembers = totalChapterVisitors > 0
                    ? topMembers
                    : formattedMembers.slice(0, 5);

                // Add chapter data to response
                responseData.push({
                    chapterId: chapter._id,
                    chapterName: chapter.chapterName,
                    overallChapterCount: totalChapterVisitors,
                    members: finalMembers
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Visitor records fetched successfully',
                data: responseData,
                pagination: {
                    total: responseData.length,
                    page,
                    limit
                },
            });
        } catch (error) {
            console.error('Error fetching Visitor records:', error);
            throw new InternalServerError('Failed to fetch Visitor records');
        }
    }


    @Get("/member/list/:id")
    async listThankyouSlipMembers(
        @Param("id") id: string,
        @Req() req: Request,
        @QueryParams() queryParams: ListVisitorDto,
        @Res() res: Response
    ) {
        // const { page = 1, limit = 10, sortField = 'createdAt', sortOrder = 'desc' } = queryParams;
        // const skip = (page - 1) * limit;

        try {
            // Verify chapter exists
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

            // Get all members in this chapter
            const members = await Member.find({
                'chapterInfo.chapterId': id,
                isActive: 1,
                isDelete: 0
            }).lean();

            // Create array of member IDs for querying
            const memberIds = members.map(member => member._id);

            // Define interfaces for populated members
            interface PopulatedMember {
                _id: mongoose.Types.ObjectId;
                personalDetails?: {
                    firstName?: string;
                    lastName?: string;
                    profileImage?: {
                        docName: string;
                        docPath: string;
                        originalName: string;
                    };
                };
                contactDetails?: {
                    mobileNumber?: string;
                };
            }

            // Query for One-to-One records involving these members
            const query: FilterQuery<IVisitor> = {
                isDelete: 0,
                $or: [
                    { invitedBy: { $in: memberIds } },
                ]
            };

            const [records, total] = await Promise.all([
                Visitor.find(query)
                    .populate<{ invitedBy: PopulatedMember }>('invitedBy', 'personalDetails contactDetails')
                    // .populate<{ toMember: PopulatedMember }>('toMember', 'personalDetails contactDetails')
                    .sort({ createdAt: -1 })
                    // .skip(skip)
                    // .limit(limit)
                    .lean(),
                Visitor.countDocuments(query)
            ]);

            // Format the response data
            const formattedRecords = records.map(record => ({
                _id: record._id,
                name: record.name,
                company: record.company,
                category: record.category,
                mobile: record.mobile,
                email: record.email,
                address: record.address,
                visitDate: record.visitDate,
                status: record.status,
                // NEW FIELDS ADDED HERE
                chapter: record.chapter,
                chapterId: record.chapterId,
                chapter_directory_name: record.chapter_directory_name,
                invited_by_member: record.invited_by_member,
                invited_from: record.invited_from,
                zone: record.zone,
                zoneId: record.zoneId,
                // invitedBy: record.invitedBy,
                // Image: record.invitedBy.personalDetails?.profileImage || "",
                invite: {
                    id: record.invitedBy?._id,
                    name: `${record.invitedBy.personalDetails?.firstName || ''} ${record.invitedBy.personalDetails?.lastName || ''}`.trim(),
                    mobile: record.invitedBy.contactDetails?.mobileNumber || '',
                    profileImage: record.invitedBy.personalDetails?.profileImage || {
                        docName: '',
                        docPath: '',
                        originalName: ''
                    }
                },
                createdAt: record.createdAt
            }));

            return res.status(200).json({
                success: true,
                message: 'Visitor members records fetched successfully',
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
                        // page,
                        // limit,
                        // totalPages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            console.error("Error fetching Visitor records:", error);
            throw new InternalServerError("Failed to fetch Visitor records");
        }
    }

    @Patch('/status/:id')
    async updateStatus(
        @Param('id') id: string,
        @Body({ validate: true }) body: UpdateStatusDto2,
        @Res() res: Response
    ) {
        try {
            const visitorRecord = await Visitor.findById(id);

            if (!visitorRecord) {
                throw new NotFoundError('Visitor record not found');
            }

            visitorRecord.status = body.status;
            await visitorRecord.save();

            return res.status(200).json({
                success: true,
                message: 'Status updated successfully',
                data: visitorRecord,
            });
        } catch (error: unknown) {
            console.error('Error updating status:', error);
            if (error instanceof NotFoundError || error) {
                throw error;
            }
            return res.status(500).json({
                success: false,
                message: 'Failed to update status',
            });
        }
    }

    @Patch('/delete/:id')
    async deleteVisitor(
        @Param('id') id: string,
        @Res() res: Response
    ) {
        try {
            const visitorRecord = await Visitor.findById(id);

            if (!visitorRecord) {
                throw new NotFoundError('Visitor record not found');
            }

            // Soft delete
            visitorRecord.isDelete = 1;
            visitorRecord.deletedAt = new Date();

            await visitorRecord.save();

            return res.status(200).json({
                success: true,
                message: 'Visitor deleted successfully',
                data: visitorRecord,
            });

        } catch (error: unknown) {
            console.error('Error deleting visitor:', error);
            if (error instanceof NotFoundError) {
                throw error;
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to delete visitor',
            });
        }
    }
}
