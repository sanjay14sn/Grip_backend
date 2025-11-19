import {
    JsonController, Post, Get, Body, Param, QueryParams, Res, Put, Delete, NotFoundError, Patch
} from 'routing-controllers';
import { Response } from 'express';
import { Chapter, IChapter } from '../../models/chapter.model';
import mongoose, { FilterQuery } from 'mongoose';
import { Zone } from '../../models/zone.model';
import { CreateChapterDto } from '../../dto/create-chapter.dto';
import { ListChapterDto } from '../../dto/list-chapter.dto';
import { Member } from '../../models/member.model';
import { OneToOne } from "../../models/onetoone.model";
import { ReferralSlipModel } from "../../models/referralslip.model";
import { TestimonialSlip } from '../../models/testimonialslip.model';
import { Visitor } from '../../models/visitor.model';
import ThankYouSlip from "../../models/thankyouslip.model";
import Payment from '../../models/payment.model';
import { User } from '../../models/user.model';

@JsonController('/api/admin/chapters')
export default class ChapterController {
    @Post('/')
    async createChapter(
        @Body({ validate: true }) chapterData: CreateChapterDto,
        @Res() res: Response
    ) {
        try {
            // Validate zone reference
            const zone = await Zone.findById(chapterData.zoneId);
            if (!zone) {
                return res.status(404).json({
                    success: false,
                    message: 'Zone not found'
                });
            }

            // Check for unique chapterName
            const existingChapter = await Chapter.findOne({
                chapterName: { $regex: new RegExp(`^${chapterData.chapterName}$`, 'i') },
                isDelete: 0
            });

            if (existingChapter) {
                return res.status(400).json({
                    success: false,
                    message: 'Chapter with this name already exists'
                });
            }

            const chapter = new Chapter({
                ...chapterData,
                countryName: chapterData.countryName.trim(),
                stateName: chapterData.stateName.trim()
            });
            chapter.createdAt = new Date();
            chapter.updatedAt = new Date();

            const savedChapter = await chapter.save();
            return res.status(201).json({
                success: true,
                message: 'Chapter created successfully',
                data: savedChapter
            });
        } catch (error: unknown) {
            return res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'An unknown error occurred'
            });
        }
    }

    @Get('/list')
    async listChapters(
        @QueryParams() queryParams: ListChapterDto,
        @Res() res: Response
    ) {
        try {
            const filter: FilterQuery<IChapter> = { isDelete: 0 };

            if (queryParams.search) {
                filter.$or = [
                    { chapterName: { $regex: queryParams.search, $options: 'i' } }
                ];
            }

            if (queryParams.countryName) {
                filter.countryName = { $regex: queryParams.countryName, $options: 'i' };
            }

            if (queryParams.stateName) {
                filter.stateName = { $regex: queryParams.stateName, $options: 'i' };
            }

            if (queryParams.zoneId) {
                filter.zoneId = queryParams.zoneId;
            }

            const sort: { [key: string]: 1 | -1 } = {};
            if (queryParams.sortField) {
                sort[queryParams.sortField] = queryParams.sortOrder === 'asc' ? 1 : -1;
            }

            const page = queryParams.page || 1;
            const limit = queryParams.limit || 100;
            const skip = (page - 1) * limit;

            const [chapters, total] = await Promise.all([
                Chapter.find(filter)
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .populate('zoneId', 'zoneName')
                    .populate('cidId', 'name email'),
                Chapter.countDocuments(filter)
            ]);

            return res.status(200).json({
                success: true,
                message: 'Chapters fetched successfully',
                data: chapters,
                meta: {
                    page: queryParams.page,
                    limit: queryParams.limit,
                    total
                }
            });
        } catch (error: unknown) {
            return res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'An unknown error occurred'
            });
        }
    }

    @Get('/:id')
    async getChapterById(
        @Param('id') id: string,
        @Res() res: Response
    ) {
        try {
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
            const members = await Member.find({
                'chapterInfo.chapterId': id,
                isActive: 1,
                isDelete: 0
            })
                .select('personalDetails.firstName personalDetails.lastName contactDetails.email contactDetails.mobileNumber')
                .lean();

            // Format member data
            const formattedMembers = members.map(member => ({
                id: member._id,
                name: `${member.personalDetails?.firstName || ''} ${member.personalDetails?.lastName || ''}`.trim(),
                email: member.contactDetails?.email,
                mobileNumber: member.contactDetails?.mobileNumber
            }));

            // Get member count
            const memberCount = await Member.countDocuments({
                'chapterInfo.chapterId': id,
                isActive: 1,
                isDelete: 0
            });

            const chapterData = {
                ...chapter.toObject(),
                memberCount,
                members: formattedMembers
            };

            return res.status(200).json({
                success: true,
                message: 'Chapter fetched successfully',
                data: chapterData
            });
        } catch (error: unknown) {
            console.error('Error fetching chapter details:', error);
            return res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'An unknown error occurred'
            });
        }
    }

    @Put('/:id')
    async updateChapter(
        @Param('id') id: string,
        @Body({ validate: true }) chapterData: CreateChapterDto,
        @Res() res: Response
    ) {
        try {
            const chapter = await Chapter.findById(id);
            if (!chapter) {
                return res.status(404).json({
                    success: false,
                    message: 'Chapter not found'
                });
            }

            // Trim country and state names if provided
            if (chapterData.countryName) {
                chapterData.countryName = chapterData.countryName.trim();
            }
            if (chapterData.stateName) {
                chapterData.stateName = chapterData.stateName.trim();
            }

            if (chapterData.zoneId) {
                const zone = await Zone.findById(chapterData.zoneId);
                if (!zone) {
                    return res.status(404).json({
                        success: false,
                        message: 'Zone not found'
                    });
                }
            }

            // Check for unique chapterName if provided
            if (chapterData.chapterName) {
                const existingChapter = await Chapter.findOne({
                    _id: { $ne: id },
                    chapterName: { $regex: new RegExp(`^${chapterData.chapterName}$`, 'i') },
                    isDelete: 0
                });

                if (existingChapter) {
                    return res.status(400).json({
                        success: false,
                        message: 'Chapter with this name already exists'
                    });
                }
            }

            const updatedChapter = await Chapter.findByIdAndUpdate(
                id,
                {
                    ...chapterData,
                    updatedAt: new Date()
                },
                { new: true }
            )
                .populate('countryId', 'countryName')
                .populate('stateId', 'stateName')
                .populate('zoneId', 'zoneName')
                .populate('cidId', 'name email');

            return res.status(200).json({
                success: true,
                message: 'Chapter updated successfully',
                data: updatedChapter
            });
        } catch (error: unknown) {
            return res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'An unknown error occurred'
            });
        }
    }

    @Delete('/:id')
    async deleteChapter(
        @Param('id') id: string,
        @Res() res: Response
    ) {
        try {
            const chapter = await Chapter.findOne({ _id: id, isDelete: 0 });
            if (!chapter) {
                return res.status(404).json({
                    success: false,
                    message: 'Chapter not found'
                });
            }

            chapter.isDelete = 1;
            chapter.deletedAt = new Date();
            chapter.updatedAt = new Date();

            await chapter.save();
            return res.status(200).json({
                success: true,
                message: 'Chapter deleted successfully'
            });
        } catch (error: unknown) {
            return res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'An unknown error occurred'
            });
        }
    }

    @Get('/by-zone/:zoneId')
    async getChaptersByZone(
        @Param('zoneId') zoneId: string,
        @Res() res: Response
    ) {
        try {
            // Check if zone exists
            const zone = await Zone.findById(zoneId);
            if (!zone) {
                throw new NotFoundError('Zone not found');
            }

            const chapters = await Chapter.find({
                zoneId: zoneId,
                isDelete: 0
            })
                .populate('cidId', 'name email phoneNumber') // Populate CID data with name, email, and phoneNumber
                .sort({ chapterName: 1 });

            return res.status(200).json({
                success: true,
                message: 'Chapters fetched successfully',
                data: chapters,
                zoneInfo: {
                    zoneId: zone._id,
                    zoneName: zone.zoneName,
                    countryName: zone.countryName,
                    stateName: zone.stateName
                }
            });
        } catch (error: unknown) {
            console.error('Error fetching chapters by zone:', error);
            if (error instanceof NotFoundError) {
                throw error;
            }
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch chapters by zone',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    @Get('/report/chapter-stats')
    async listChapterStats(@Res() res: Response) {
        // console.log("Generating chapter statistics report...");
        try {
            // console.log("Starting report generation");

            // Get all active chapters
            const chapters = await Chapter.find({ isDelete: 0, }).lean();
            // console.log(`Found ${chapters.length} chapters`);

            const responseData = [];

            for (const chapter of chapters) {
                try {
                    // console.log(`Processing chapter: ${chapter._id}`);

                    // Validate chapter ID
                    if (!chapter?._id || !mongoose.Types.ObjectId.isValid(String(chapter._id))) {
                        console.warn(`Invalid chapter ID: ${chapter._id}`);
                        continue;
                    }

                    const chapterObjectId = new mongoose.Types.ObjectId(String(chapter._id));

                    // Get member count for this chapter
                    const memberCount = await Member.countDocuments({
                        "chapterInfo.chapterId": chapterObjectId,
                        isDelete: 0
                    });
                    // console.log(`Chapter ${chapter._id} has ${memberCount} members`);
                    if (memberCount === 0) {
                        responseData.push({
                            chapterId: chapter._id,
                            chapterName: chapter.chapterName,
                            MembersCount: 0,
                            oneTooneCount: 0,
                            referalCount: 0,
                            testimonialCount: 0,
                            thankyouslip: 0,
                            visitors: 0,
                            eventCount: 0
                        });
                        continue;
                    }
                    const memberIds = await Member.find({
                        "chapterInfo.chapterId": chapterObjectId,
                        isDelete: 0
                    }).distinct('_id');

                    const memberObjectIds = memberIds.map(id => new mongoose.Types.ObjectId(String(id)));
                    // console.log(`Found ${memberObjectIds.length} member IDs`);
                    const [
                        oneToOneCount,
                        referralCount,
                        testimonialCount,
                        thankYouSlips,
                        visitorCount,
                        eventCount
                    ] = await Promise.all([
                        OneToOne.countDocuments({
                            $or: [
                                { 'toMember': { $in: memberObjectIds } },
                                { 'fromMember': { $in: memberObjectIds } }
                            ],
                            isDelete: 0
                        }),

                        ReferralSlipModel.countDocuments({
                            $or: [
                                { 'toMember': { $in: memberObjectIds } },
                                { 'fromMember': { $in: memberObjectIds } }
                            ],
                            isDelete: 0
                        }),

                        TestimonialSlip.countDocuments({
                            $or: [
                                { 'toMember': { $in: memberObjectIds } },
                                { 'fromMember': { $in: memberObjectIds } }
                            ],
                            isDelete: 0
                        }),

                        ThankYouSlip.aggregate([
                            {
                                $match: {
                                    $or: [
                                        { 'toMember': { $in: memberObjectIds } },
                                        { 'fromMember': { $in: memberObjectIds } }
                                    ],
                                    isDelete: 0
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    totalAmount: { $sum: "$amount" }
                                }
                            }
                        ]),

                        Visitor.countDocuments({
                            'invitedBy': { $in: memberObjectIds },
                            isDelete: 0
                        }),

                        // Added event count query
                        Payment.countDocuments({
                            chapterId: chapterObjectId,
                            purpose: 'event',
                            isDelete: 0,
                            date: { $gte: new Date() } // Only count future events if needed
                        })
                    ]);

                    const thankYouSlipAmount = thankYouSlips[0]?.totalAmount || 0;

                    responseData.push({
                        chapterId: chapter._id,
                        chapterName: chapter.chapterName,
                        MembersCount: memberCount,
                        oneTooneCount: oneToOneCount,
                        referalCount: referralCount,
                        testimonialCount: testimonialCount,
                        thankyouslip: thankYouSlipAmount,
                        visitors: visitorCount,
                        eventCount: eventCount // Added event count to response
                    });

                } catch (chapterError) {
                    console.error(`Error processing chapter ${chapter?._id}:`, chapterError);
                    continue;
                }
            }

            return res.status(200).json({
                success: true,
                message: "Chapter statistics fetched successfully",
                data: responseData,
                pagination: {
                    total: responseData.length
                },
            });

        } catch (error) {
            console.error("Error in report generation:", error);
            return res.status(500).json({
                success: false,
                message: "Failed to generate report",
                error: error instanceof Error ? error.message : 'An unknown error occurred'
            });
        }
    }

    @Get('/statsCount/:chapterId')
    async getChapterStatsById(
        @Param('chapterId') chapterId: string,
        @Res() res: Response
    ) {
        try {
            const chapter = await Chapter.findById(chapterId);
            if (!chapter) {
                return res.status(404).json({
                    success: false,
                    message: 'Chapter not found'
                });
            }

            const members = await Member.find({ "chapterInfo.chapterId": chapter._id, isDelete: 0 });
            const memberObjectIds = members.map(member => member._id);
            const [
                oneToOneCount,
                referralCount,
                testimonialCount,
                thankYouSlips,
                visitorCount,
                eventCount
            ] = await Promise.all([
                OneToOne.countDocuments({
                    $or: [
                        { 'toMember': { $in: memberObjectIds } },
                        { 'fromMember': { $in: memberObjectIds } }
                    ],
                    isDelete: 0
                }),
                ReferralSlipModel.countDocuments({
                    $or: [
                        { 'toMember': { $in: memberObjectIds } },
                        { 'fromMember': { $in: memberObjectIds } }
                    ],
                    isDelete: 0
                }),
                TestimonialSlip.countDocuments({
                    $or: [
                        { 'toMember': { $in: memberObjectIds } },
                        { 'fromMember': { $in: memberObjectIds } }
                    ],
                    isDelete: 0
                }),
                ThankYouSlip.aggregate([
                    {
                        $match: {
                            $or: [
                                { 'toMember': { $in: memberObjectIds } },
                                { 'fromMember': { $in: memberObjectIds } }
                            ],
                            isDelete: 0
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalAmount: { $sum: "$amount" }
                        }
                    }
                ]),
                Visitor.countDocuments({
                    'invitedBy': { $in: memberObjectIds },
                    isDelete: 0
                }),
                Payment.countDocuments({
                    chapterId: chapter._id,
                    purpose: 'event',
                    isDelete: 0,
                    date: { $gte: new Date() }
                })
            ]);
            const thankYouSlipAmount = thankYouSlips[0]?.totalAmount || 0;
            const responseData = {
                chapterId: chapter._id,
                chapterName: chapter.chapterName,
                MembersCount: members.length,
                oneTooneCount: oneToOneCount,
                referalCount: referralCount,
                testimonialCount: testimonialCount,
                thankyouslip: thankYouSlipAmount,
                visitors: visitorCount,
                eventCount: eventCount
            };
            return res.status(200).json({
                success: true,
                message: "Chapter statistics fetched successfully",
                data: responseData
            });

        } catch (error) {
            console.error(`Error processing chapter ${chapterId}:`, error);
            return res.status(500).json({
                success: false,
                message: 'Failed to generate report',
                error: error instanceof Error ? error.message : 'An unknown error occurred'
            });
        }
    }
    @Get('/headTableUsers/:chapterId')
    async getHeadTableUsers(
        @Param('chapterId') chapterId: string,
        @Res() res: Response
    ) {
        try {
            const chapter = await Chapter.findById(chapterId);
            if (!chapter) {
                return res.status(404).json({
                    success: false,
                    message: 'Chapter not found'
                });
            }

            const cidIds = chapter.cidId || [];
            const mentorId = chapter.mentorId;

            const userIds = mentorId ? [...cidIds, mentorId] : cidIds;

            const userPipeline = [
                { $match: { _id: { $in: userIds } } },
                { $addFields: { role_id: { $toObjectId: '$role' } } },
                {
                    $lookup: {
                        from: 'roles',
                        localField: 'role_id',
                        foreignField: '_id',
                        as: 'roleDetails'
                    }
                },
                { $unwind: { path: '$roleDetails', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 0,
                        name: '$name',
                        companyName: '$companyName',
                        mobileNumber: '$mobileNumber',
                        email: '$email',
                        roleName: { $ifNull: ['$roleDetails.name', 'N/A'] },
                        profileImage: { $ifNull: ['$profileImage', null] }
                    }
                }
            ];

            const userResult = await User.aggregate(userPipeline);

            return res.status(200).json({
                success: true,
                message: 'Head table users fetched successfully',
                data: userResult
            });

        } catch (error) {
            console.error(`Error fetching head table users for chapter ${chapterId}:`, error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch head table users',
                error: error instanceof Error ? error.message : 'An unknown error occurred'
            });
        }
    }


    @Get('/headTableMembers/:chapterId')
    async getHeadTableMembers(
        @Param('chapterId') chapterId: string,
        @Res() res: Response
    ) {
        try {
            const chapter = await Chapter.findById(chapterId);
            if (!chapter) {
                return res.status(404).json({
                    success: false,
                    message: 'Chapter not found'
                });
            }
            const memberPipeline = [
                { $match: { 'chapterInfo.chapterId': new mongoose.Types.ObjectId(chapterId), isHeadtable: true, isDelete: 0 } },
                { $lookup: { from: 'roles', localField: 'role', foreignField: '_id', as: 'roleDetails' } },
                { $unwind: { path: '$roleDetails', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 0,
                        name: { $concat: ['$personalDetails.firstName', ' ', '$personalDetails.lastName'] },

                        companyName: '$personalDetails.companyName',
                        mobileNumber: '$contactDetails.mobileNumber',
                        email: '$contactDetails.email',
                        roleName: { $ifNull: ['$roleDetails.name', 'N/A'] },
                        profileImage: { $ifNull: ['$personalDetails.profileImage', null] }
                    }
                }
            ];

            const headTableMembers = await Member.aggregate(memberPipeline);

            return res.status(200).json({
                success: true,
                message: 'Head table members fetched successfully',
                data: headTableMembers
            });

        } catch (error) {
            console.error(`Error fetching head table members for chapter ${chapterId}:`, error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch head table members',
                error: error instanceof Error ? error.message : 'An unknown error occurred'
            });
        }
    }

    @Get('/topPerformersofChapter/:chapterId')
    async getChapterTopPerformers(
        @Param('chapterId') chapterId: string,
        @QueryParams() queryParams: { limit?: number },
        @Res() res: Response
    ) {
        try {
            const limit = queryParams.limit ?? 3;
            const chapterObjectId = new mongoose.Types.ObjectId(chapterId);

            const chapter = await Chapter.findById(chapterObjectId);
            if (!chapter) {
                throw new NotFoundError('Chapter not found');
            }

            const chapterMembers = await Member.find({ 'chapterInfo.chapterId': chapterObjectId, isDelete: 0 }).select('_id');
            const memberIds = chapterMembers.map(member => member._id);

            if (memberIds.length === 0) {
                return res.status(200).json({
                    success: true,
                    message: 'Chapter has no members, so no statistics are available.',
                    data: {
                        thankYouSlips: { totalAmount: 0, topReceivers: [] },
                        testimonialSlips: { totalCount: 0, topReceivers: [] },
                        oneToOneMeetings: { totalCount: 0, topReceivers: [] },
                        visitors: { totalCount: 0, topReceivers: [] },
                        referralSlips: { totalCount: 0, topReceivers: [] }
                    }
                });
            }

            const getTopMembers = async (model: mongoose.Model<any>, matchField: string, groupField: string, limit: number) => {
                return model.aggregate([
                    { $match: { [matchField]: { $in: memberIds }, isDelete: 0 } },
                    { $group: { _id: `$${groupField}`, count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: limit },
                    {
                        $lookup: {
                            from: 'members',
                            localField: '_id',
                            foreignField: '_id',
                            as: 'memberDetails'
                        }
                    },
                    { $unwind: '$memberDetails' },
                    {
                        $project: {
                            _id: 0,
                            memberId: '$_id',
                            name: { $concat: ['$memberDetails.personalDetails.firstName', ' ', '$memberDetails.personalDetails.lastName'] },
                            profileImage: '$memberDetails.personalDetails.profileImage',
                            count: '$count'
                        }
                    }
                ]);
            };

            const [
                thankYouSlipAmountResult,
                topThankYouReceivers,
                testimonialSlipCount,
                topTestimonialReceivers,
                oneToOneCount,
                topOneToOneMembers,
                visitorCount,
                topVisitorBringers,
                referralSlipCount,
                topReferralReceivers
            ] = await Promise.all([
                ThankYouSlip.aggregate([
                    { $match: { toMember: { $in: memberIds }, isDelete: 0 } },
                    { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
                ]),
                getTopMembers(ThankYouSlip, 'toMember', 'toMember', limit),

                TestimonialSlip.countDocuments({ toMember: { $in: memberIds }, isDelete: 0 }),
                getTopMembers(TestimonialSlip, 'toMember', 'toMember', limit),

                OneToOne.countDocuments({ fromMember: { $in: memberIds }, isDelete: 0 }),
                getTopMembers(OneToOne, 'fromMember', 'fromMember', limit),

                Visitor.countDocuments({ invitedBy: { $in: memberIds }, isDelete: 0 }),
                getTopMembers(Visitor, 'invitedBy', 'invitedBy', limit),

                ReferralSlipModel.countDocuments({ toMember: { $in: memberIds }, isDelete: 0 }),
                getTopMembers(ReferralSlipModel, 'toMember', 'toMember', limit),
            ]);

            const thankYouSlipTotalAmount = thankYouSlipAmountResult.length > 0 ? thankYouSlipAmountResult[0].totalAmount : 0;

            return res.status(200).json({
                success: true,
                message: 'Chapter statistics fetched successfully',
                data: {
                    thankYouSlips: {
                        totalAmount: thankYouSlipTotalAmount,
                        topReceivers: topThankYouReceivers
                    },
                    testimonialSlips: {
                        totalCount: testimonialSlipCount,
                        topReceivers: topTestimonialReceivers
                    },
                    oneToOneMeetings: {
                        totalCount: oneToOneCount,
                        topReceivers: topOneToOneMembers
                    },
                    visitors: {
                        totalCount: visitorCount,
                        topReceivers: topVisitorBringers
                    },
                    referralSlips: {
                        totalCount: referralSlipCount,
                        topReceivers: topReferralReceivers
                    }
                }
            });

        } catch (error) {
            if (error instanceof NotFoundError) {
                return res.status(404).json({ success: false, message: error.message });
            }
            console.error(`Error fetching statistics for chapter ${chapterId}:`, error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch chapter statistics',
                error: error instanceof Error ? error.message : 'An unknown error occurred'
            });
        }
    }

    @Patch('/:id/status')
    async updateChapterStatus(
        @Param('id') id: string,
        @Body() statusData: { isActive: number, weekday:string},
        @Res() res: Response
    ) {
        try {
            console.log(statusData,"status")
            const updatedChapter = await Chapter.findOneAndUpdate(
                { _id: id, isDelete: 0 },
                {
                    $set: {
                        isActive: statusData.isActive,
                        weekday: statusData.weekday,
                        updatedAt: new Date()
                    }
                },
                { new: true, runValidators: false }
            );

            if (!updatedChapter) {
                return res.status(404).json({
                    success: false,
                    message: 'Chapter not found or has been deleted'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Chapter status updated successfully',
                data: {
                    id: updatedChapter._id,
                    chapterName: updatedChapter.chapterName,
                    isActive: updatedChapter.isActive
                }
            });
        } catch (error) {
            console.error(`Error updating chapter status for chapter ${id}:`, error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update chapter status',
                error: error instanceof Error ? error.message : 'An unknown error occurred'
            });
        }
    }
}
