import { Get, JsonController, QueryParam, Res, UseBefore } from "routing-controllers";
import { AuthMiddleware } from "../../middleware/AuthorizationMiddleware";
import { Zone } from "../../models/zone.model";
import { Member } from "../../models/member.model";
import { Chapter } from "../../models/chapter.model";
import { User } from "../../models/user.model";
import { Response } from "express";
import thankyouslipModel from "../../models/thankyouslip.model";
import moment from "moment";
@JsonController("/api/admin/dashboard")
export default class DashboardController {
    @Get("/statsCount")
    async getAllCounts(@Res() res: Response) {
        try {
            const [zoneCount, memberCount, chapterCount, cidCountResult] =
                await Promise.all([
                    Zone.countDocuments({ isActive: 1, isDelete: 0 }),
                    Member.countDocuments({ isActive: 1, isDelete: 0 }),
                    Chapter.countDocuments({ isActive: 1, isDelete: 0 }),
                    User.aggregate([
                        {
                            $match: {
                                isDelete: 0,
                                isActive: 1,
                            },
                        },
                        {
                            $addFields: {
                                roleObjId: {
                                    $toObjectId: "$role",
                                },
                            },
                        },
                        {
                            $lookup: {
                                from: "roles",
                                localField: "roleObjId",
                                foreignField: "_id",
                                as: "roleInfo",
                            },
                        },
                        {
                            $unwind: "$roleInfo",
                        },
                        {
                            $match: {
                                "roleInfo.name": { $regex: "^cid$", $options: "i" },
                            },
                        },
                        { $count: "total" },
                    ]),
                ]);

            const cidCount = cidCountResult[0]?.total || 0;

            return res.status(200).send({
                success: true,
                message: "Dashboard counts retrieved successfully",
                data: {
                    zoneCount,
                    memberCount,
                    chapterCount,
                    cidCount,
                },
            });
        } catch (error) {
            console.error("Error fetching counts:", error);
            return res.status(500).send({ success: false, message: "Failed to fetch counts" });
        }
    }

    @Get("/income-summary")
    async getIncomeSummary(
        @QueryParam("dateFilter") dateFilter: string,
        @Res() res: Response
    ) {
        try {
            const today = moment();
            let startDate: Date | null = null;

            if (dateFilter === "month") {
                startDate = today.clone().startOf("month").toDate();
            } else if (dateFilter === "week") {
                startDate = today.clone().startOf("week").toDate();
            } else if (dateFilter === "year") {
                startDate = today.clone().startOf("year").toDate();
            }

            const match: any = { isDelete: 0, isActive: 1, status: "approve" };
            if (startDate) {
                match.createdAt = { $gte: startDate };
            }

            const result = await thankyouslipModel.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: "$amount" },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        totalAmount: 1,
                    },
                },
            ]);

            return res.status(200).send({
                success: true,
                message: "Income summary retrieved successfully",
                data: result[0]?.totalAmount || 0,
            });
        } catch (error) {
            console.error("Income aggregation error:", error);
            return res.status(500).send({ success: false, message: "Failed to fetch income summary" });
        }
    }
    @Get("/getHowDidYouHearStats")
    async getHowDidYouHearStats(
        @Res() res: Response,
        @QueryParam("dateFilter") dateFilter: string
    ) {
        try {
            const today = moment();
            let startDate: Date | null = null;

            if (dateFilter === "month") {
                startDate = today.clone().startOf("month").toDate();
            } else if (dateFilter === "week") {
                startDate = today.clone().startOf("week").toDate();
            } else if (dateFilter === "year") {
                startDate = today.clone().startOf("year").toDate();
            }

            const match: any = { isDelete: 0, isActive: 1 };
            if (startDate) {
                match.createdAt = { $gte: startDate };
            }
            const result = await Member.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: "$chapterInfo.howDidYouHearAboutGRIP",
                        count: { $sum: 1 }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$count" },
                        data: {
                            $push: {
                                type: "$_id",
                                count: "$count"
                            }
                        }
                    }
                },
                { $unwind: "$data" },
                {
                    $addFields: {
                        "data.percentage": {
                            $round: [
                                {
                                    $multiply: [
                                        { $divide: ["$data.count", "$total"] },
                                        100
                                    ]
                                },
                                0
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $first: "$total" },
                        hearAboutGRIP: { $push: "$data" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        totalMembers: "$total",
                        hearAboutGRIP: 1
                    }
                }
            ]);

            return res.status(200).send({
                success: true,
                message: "How did you hear stats retrieved successfully",
                data: result[0] ?? { totalMembers: 0, hearAboutGRIP: [] }
            });
        } catch (error) {
            console.error("Aggregation error:", error);
            return res.status(500).send({ success: false, message: "Failed to fetch how did you hear stats" });
        }
    };

    @Get("/getRecentMembers")
    async getRecentMembers(
        @Res() res: Response,
    ) {
        try {
            const match: any = { isDelete: 0, isActive: 1, status: "active" };
            const result = await Member.aggregate([
                { $match: match },
                {
                    "$lookup": {
                        "from": "chapters",
                        "localField": "chapterInfo.chapterId",
                        "foreignField": "_id",
                        "as": "chapterDetails"
                    }
                },
                {
                    "$unwind": "$chapterDetails"
                },
                {
                    "$project": {
                        "name": {
                            "$concat": [
                                "$personalDetails.firstName",
                                " ",
                                "$personalDetails.lastName"
                            ]
                        },
                        "designation": "$personalDetails.categoryRepresented",
                        "companyName": "$personalDetails.companyName",
                        "chapter": "$chapterDetails.chapterName",
                        "meetingDate": "$chapterDetails.meetingDayAndTime",
                        "createdAt": 1
                    }
                },
                {
                    "$sort": {
                        "createdAt": -1
                    }
                },
                {
                    "$limit": 5
                }
            ]);

            return res.status(200).send({
                success: true,
                message: "Recent members retrieved successfully",
                data: result
            });
        } catch (error) {
            console.error("Aggregation error:", error);
            return res.status(500).send({ success: false, message: "Failed to fetch recent members" });
        }


    };
    @Get("/getRecentEnquiries")
    async getRecentEnquiries(
        @Res() res: Response,
    ) {
        try {
            const match: any = { isDelete: 0, isActive: 1, status: "active" };
            const result = await Member.aggregate([
                { $match: match },
                {
                    "$lookup": {
                        "from": "chapters",
                        "localField": "chapterInfo.chapterId",
                        "foreignField": "_id",
                        "as": "chapterDetails"
                    }
                },
                {
                    "$unwind": "$chapterDetails"
                },
                {
                    "$project": {
                        "name": {
                            "$concat": [
                                "$personalDetails.firstName",
                                " ",
                                "$personalDetails.lastName"
                            ]
                        },
                        "profileImage": "$personalDetails.profileImage",
                        "designation": "$personalDetails.categoryRepresented",
                        "companyName": "$personalDetails.companyName",
                        "chapter": "$chapterDetails.chapterName",
                        "howDidYouHearAboutGRIP": "$chapterInfo.howDidYouHearAboutGRIP",
                        "createdAt": 1
                    }
                },
                {
                    "$sort": {
                        "createdAt": -1
                    }
                },
                {
                    "$limit": 5
                }
            ]);

            return res.status(200).send({
                success: true,
                message: "Recent enquiries retrieved successfully",
                data: result
            });
        } catch (error) {
            console.error("Aggregation error:", error);
            return res.status(500).send({ success: false, message: "Failed to fetch recent enquiries" });
        }


    };
}
