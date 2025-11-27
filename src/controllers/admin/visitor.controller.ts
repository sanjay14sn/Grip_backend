import mongoose, { Types } from 'mongoose';
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
    async getVisitorsByChapter(
        @Param("id") id: string,
        @QueryParams() query: any,
        @Res() res: Response
    ) {
        try {
            const {
                page = 1,
                limit = 10,
                search = "",
                sortField = "createdAt",
                sortOrder = "desc",
            } = query;

            const skip = (page - 1) * limit;

            /** -------------------------
             *  VALIDATE CHAPTER
             * ------------------------- */
            if (!Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid chapter ID format",
                });
            }

            const chapter = await Chapter.findOne({
                _id: id,
                isDelete: 0,
            })
                .populate("zoneId", "zoneName")
                .populate("cidId", "name email");

            if (!chapter) {
                return res.status(404).json({
                    success: false,
                    message: "Chapter not found",
                });
            }

            /** -------------------------
             *  BUILD QUERY
             * ------------------------- */
            const queryConditions: any = {
                isDelete: 0,
                chapterId: new Types.ObjectId(id),
            };

            /** -------------------------
             *  SEARCH
             * ------------------------- */
            if (search) {
                const searchRegex = new RegExp(search, "i");
                queryConditions.$or = [
                    { name: searchRegex },
                    { company: searchRegex },
                    { category: searchRegex },
                    { mobile: searchRegex },
                    { email: searchRegex },
                ];
            }

            /** -------------------------
             *  FETCH RECORDS + COUNT
             * ------------------------- */
            const [records, total] = await Promise.all([
                Visitor.find(queryConditions)
                    .populate("invitedBy", "personalDetails.firstName personalDetails.lastName contactDetails.email")
                    .sort({ [sortField]: sortOrder === "asc" ? 1 : -1 })
                    .skip(skip)
                    .limit(Number(limit))
                    .lean(),

                Visitor.countDocuments(queryConditions),
            ]);

            /** -------------------------
             *  RESPONSE
             * ------------------------- */
            return res.status(200).json({
                success: true,
                message: "Visitors fetched successfully",
                chapter,
                pagination: {
                    total,
                    page: Number(page),
                    limit: Number(limit),
                    totalPages: Math.ceil(total / limit),
                },
                data: records,
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
