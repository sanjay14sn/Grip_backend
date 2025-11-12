import {
    JsonController,
    Get,
    QueryParams,
    Res,
    Req,
    Param,
    InternalServerError,
    BadRequestError,
    Body,
    NotFoundError,
    Patch,
    UseBefore,
    Delete,
} from "routing-controllers";
import { Request, Response } from "express";
import { OneToOne, IOneToOne } from "../../models/onetoone.model";
import { ListOneToOneDto } from "../../dto/list-onetoone.dto";
import mongoose, { FilterQuery } from "mongoose";
import { Chapter, IChapter } from "../../models/chapter.model";
import { Member } from "../../models/member.model";
import { UpdateStatusDto2 } from "../../dto/update-status.dto";
import { AuthMiddleware } from "../../middleware/AuthorizationMiddleware";

@JsonController("/api/admin/onetoone")
@UseBefore(AuthMiddleware)
export default class OneToOneController {
    @Get("/list")
    async listOneToOnes(
        @QueryParams() queryParams: ListOneToOneDto,
        @Res() res: Response
    ) {
        const { page = 1, limit = 10 } = queryParams;

        try {
            // Get all chapters
            const filter: FilterQuery<IChapter> = { isDelete: 0 };
            const chapters = await Chapter.find(filter).lean();

            // Prepare the final response array
            const responseData = [];

            for (const chapter of chapters) {
                // Get all members for this chapter
                const members = await Member.find({
                    "chapterInfo.chapterId": chapter._id,
                    isDelete: 0,
                }).lean();

                // Format members with basic info
                const formattedMembers = members.map((member) => ({
                    id: member._id,
                    name: `${member.personalDetails?.firstName || ""} ${member.personalDetails?.lastName || ""
                        }`.trim(),
                    companyName: member.personalDetails?.companyName || "",
                    category: member.personalDetails?.categoryRepresented || "",
                    mobile: member.contactDetails?.mobileNumber || "",
                    profileImage: member.personalDetails.profileImage || {
                        docName: "",
                        docPath: "",
                        originalName: "",
                    },
                    status: member.status,
                    totalCount: 0, // Initialize count to 0
                }));

                // Get all one-to-one records for this chapter's members
                const oneToOneQuery: FilterQuery<IOneToOne> = {
                    isDelete: 0,
                    $or: [
                        { fromMember: { $in: members.map((m) => m._id) } },
                        { toMember: { $in: members.map((m) => m._id) } },
                    ],
                };

                const oneToOneRecords = await OneToOne.find(oneToOneQuery).lean();

                // Calculate one-to-one count for each member
                const memberCountMap = new Map<string, number>();

                // Initialize all member counts to 0
                formattedMembers.forEach((member) => {
                    memberCountMap.set(String(member.id), 0);
                });

                // Count interactions for each member
                oneToOneRecords.forEach((record) => {
                    if (
                        record.fromMember &&
                        memberCountMap.has(String(record.fromMember))
                    ) {
                        memberCountMap.set(
                            String(record.fromMember),
                            memberCountMap.get(String(record.fromMember))! + 1
                        );
                    }
                    if (record.toMember && memberCountMap.has(String(record.toMember))) {
                        memberCountMap.set(
                            String(record.toMember),
                            memberCountMap.get(String(record.toMember))! + 1
                        );
                    }
                });

                // Update member counts in the formatted members array
                const membersWithCounts = formattedMembers.map((member) => ({
                    ...member,
                    totalCount: memberCountMap.get(String(member.id)) || 0,
                }));

                // Calculate TOTAL sum of all individual counts (what you want as overallChapterCount)
                const sumOfAllMemberCounts = membersWithCounts.reduce(
                    (sum, member) => sum + member.totalCount,
                    0
                );

                // Sort members by one-to-one count (descending) and take top 5
                const topMembers = membersWithCounts
                    .sort((a, b) => b.totalCount - a.totalCount)
                    .slice(0, 5);

                // If no one-to-one records, just take first 5 members
                const finalMembers =
                    sumOfAllMemberCounts > 0 ? topMembers : formattedMembers.slice(0, 5);

                // Add chapter data to response
                responseData.push({
                    chapterId: chapter._id,
                    chapterName: chapter.chapterName,
                    overallChapterCount: sumOfAllMemberCounts, // Now shows the sum of all individual counts
                    members: finalMembers,
                });
            }

            return res.status(200).json({
                success: true,
                message: "OneToOne records fetched successfully",
                data: responseData,
                pagination: {
                    total: responseData.length,
                    page,
                    limit,
                },
            });
        } catch (error) {
            console.error("Error fetching OneToOne records:", error);
            throw new InternalServerError("Failed to fetch OneToOne records");
        }
    }

    @Get("/member/list/:id")
    async listOneToOnesMembers(
        @Param("id") id: string,
        @Req() req: Request,
        @QueryParams() queryParams: ListOneToOneDto,
        @Res() res: Response
    ) {
        const { page = 1, limit = 10, sortField = 'createdAt', sortOrder = 'desc' } = queryParams;
        const skip = (page - 1) * limit;

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
            const query: FilterQuery<IOneToOne> = {
                isDelete: 0,
                $or: [
                    { fromMember: { $in: memberIds } },
                    { toMember: { $in: memberIds } }
                ]
            };

            const [records, total] = await Promise.all([
                OneToOne.find(query)
                    .populate<{ fromMember: PopulatedMember }>('fromMember', 'personalDetails contactDetails')
                    .populate<{ toMember: PopulatedMember }>('toMember', 'personalDetails contactDetails')
                    .sort({ [sortField]: sortOrder === "asc" ? 1 : -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                OneToOne.countDocuments(query)
            ]);

            // Format the response data
            const formattedRecords = records.map(record => ({
                _id: record._id,
                whereDidYouMeet: record.whereDidYouMeet,
                date: record.date,
                address: record.address,
                images: record.images,
                fromMember: {
                    id: record.fromMember?._id,
                    name: record.fromMember ?
                        `${record.fromMember.personalDetails?.firstName || ''} ${record.fromMember.personalDetails?.lastName || ''}`.trim() : '',
                    mobile: record.fromMember?.contactDetails?.mobileNumber || '',
                    profileImage: record.fromMember?.personalDetails?.profileImage || null
                },
                toMember: {
                    id: record.toMember?._id,
                    name: record.toMember ?
                        `${record.toMember.personalDetails?.firstName || ''} ${record.toMember.personalDetails?.lastName || ''}`.trim() : '',
                    mobile: record.toMember?.contactDetails?.mobileNumber || '',
                    profileImage: record.toMember?.personalDetails?.profileImage || null
                },
                createdAt: record.createdAt,
                status: record.status
            }));

            return res.status(200).json({
                success: true,
                message: 'One-to-One records fetched successfully',
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
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });
        } catch (error) {
            console.error("Error fetching One-to-One records:", error);
            throw new InternalServerError("Failed to fetch One-to-One records");
        }
    }
    @Patch('/status/:id')
    async updateStatus(
        @Param('id') id: string,
        @Body({ validate: true }) body: UpdateStatusDto2,
        @Res() res: Response
    ) {
        try {
            const oneToOneRecord = await OneToOne.findById(id);

            if (!oneToOneRecord) {
                throw new NotFoundError('One-to-one record not found');
            }

            oneToOneRecord.status = body.status;
            await oneToOneRecord.save();

            return res.status(200).json({
                success: true,
                message: 'Status updated successfully',
                data: oneToOneRecord,
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

    @Patch("/delete/:id")
    async deleteOneToOneById(
        @Param("id") id: string,
        @Res() res: Response
    ) {
        try {
            console.log(id,"DDDDDDD");
            
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ success: false, message: "Invalid id" });
            }

            const deleted = await OneToOne.findOneAndUpdate(
                { _id: id, isDelete: 0 },
                {
                    $set: {
                        isDelete: 1,
                        status: "deleted", // optional: keep consistent with your model
                        updatedAt: new Date(),
                    },
                },
                { new: true }
            ).select("fromMember toMember whereDidYouMeet date address status isDelete");

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    message: "OneToOne record not found or already deleted",
                });
            }

            return res.status(200).json({
                success: true,
                message: "OneToOne record deleted successfully",
                data: deleted,
            });
        } catch (error: unknown) {
            console.error("Error deleting OneToOne by id:", error);
            throw new InternalServerError(
                error instanceof Error ? error.message : "Failed to delete record"
            );
        }
    }
}
