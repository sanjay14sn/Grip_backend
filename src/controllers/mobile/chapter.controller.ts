import {
  JsonController,
  Post,
  Get,
  Body,
  Param,
  QueryParams,
  Res,
  Put,
  Delete,
  NotFoundError,
  UseBefore,
} from "routing-controllers";
import { Response } from "express";
import { Chapter, IChapter } from "../../models/chapter.model";
import mongoose, { FilterQuery } from "mongoose";
import { Zone } from "../../models/zone.model";
import { ListChapterDto } from "../../dto/list-chapter.dto";
import { Member } from "../../models/member.model";
import { OneToOne } from "../../models/onetoone.model";
import { ReferralSlipModel } from "../../models/referralslip.model";
import { TestimonialSlip } from "../../models/testimonialslip.model";
import { Visitor } from "../../models/visitor.model";
import ThankYouSlip from "../../models/thankyouslip.model";
import { AuthMiddleware } from "../../middleware/AuthorizationMiddleware";
import { User } from "../../models/user.model";
import { TopAchiver } from "../../models/topAchiver.model";
import { HeadTable } from "../../models/headtable.model";


@JsonController("/api/mobile/chapters")
export default class ChapterController {
  @Get("/list")
  async listChapters(
    @QueryParams() queryParams: ListChapterDto,
    @Res() res: Response
  ) {
    try {
      const filter: FilterQuery<IChapter> = { isDelete: 0 };

      if (queryParams.search) {
        filter.$or = [
          { chapterName: { $regex: queryParams.search, $options: "i" } },
        ];
      }

      if (queryParams.countryName) {
        filter.countryName = { $regex: queryParams.countryName, $options: "i" };
      }

      if (queryParams.stateName) {
        filter.stateName = { $regex: queryParams.stateName, $options: "i" };
      }

      if (queryParams.zoneId) {
        filter.zoneId = queryParams.zoneId;
      }

      const sort: { [key: string]: 1 | -1 } = {};
      if (queryParams.sortField) {
        sort[queryParams.sortField] = queryParams.sortOrder === "asc" ? 1 : -1;
      }

      const page = queryParams.page || 1;
      const limit = queryParams.limit || 100;
      const skip = (page - 1) * limit;

      const [chapters, total] = await Promise.all([
        Chapter.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate("zoneId", "zoneName")
          .populate("cidId", "name email"),
        Chapter.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        message: "Chapters fetched successfully",
        data: chapters,
        meta: {
          page: queryParams.page,
          limit: queryParams.limit,
          total,
        },
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }

  @Get("/:id")
  async getChapterById(@Param("id") id: string, @Res() res: Response) {
    try {
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
      const members = await Member.find({
        "chapterInfo.chapterId": id,
        isActive: 1,
        isDelete: 0,
      })
        .select(
          "personalDetails.firstName personalDetails.lastName contactDetails.email contactDetails.mobileNumber"
        )
        .lean();

      // Format member data
      const formattedMembers = members.map((member) => ({
        id: member._id,
        name: `${member.personalDetails?.firstName || ""} ${
          member.personalDetails?.lastName || ""
        }`.trim(),
        email: member.contactDetails?.email,
        mobileNumber: member.contactDetails?.mobileNumber,
      }));

      // Get member count
      const memberCount = await Member.countDocuments({
        "chapterInfo.chapterId": id,
        isActive: 1,
        isDelete: 0,
      });

      const chapterData = {
        ...chapter.toObject(),
        memberCount,
        members: formattedMembers,
      };

      return res.status(200).json({
        success: true,
        message: "Chapter fetched successfully",
        data: chapterData,
      });
    } catch (error: unknown) {
      console.error("Error fetching chapter details:", error);
      return res.status(500).json({
        success: false,
        message:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }

  @Get("/by-zone/:zoneId")
  async getChaptersByZone(
    @Param("zoneId") zoneId: string,
    @Res() res: Response
  ) {
    try {
      // Check if zone exists
      const zone = await Zone.findById(zoneId);
      if (!zone) {
        throw new NotFoundError("Zone not found");
      }

      const chapters = await Chapter.find({
        zoneId: zoneId,
        isDelete: 0,
      })
        .populate("cidId", "name email phoneNumber") // Populate CID data with name, email, and phoneNumber
        .sort({ chapterName: 1 });

      return res.status(200).json({
        success: true,
        message: "Chapters fetched successfully",
        data: chapters,
        zoneInfo: {
          zoneId: zone._id,
          zoneName: zone.zoneName,
          countryName: zone.countryName,
          stateName: zone.stateName,
        },
      });
    } catch (error: unknown) {
      console.error("Error fetching chapters by zone:", error);
      if (error instanceof NotFoundError) {
        throw error;
      }
      return res.status(500).json({
        success: false,
        message: "Failed to fetch chapters by zone",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  @Get("/top-performer-monthly/:chapterId")
  @UseBefore(AuthMiddleware)
  async getChapterTopPerformerOfTheMonth(
    @Param("chapterId") chapterId: string,
    @Res() res: Response
  ) {
    try {
      const chapterObjectId = new mongoose.Types.ObjectId(chapterId);
      const chapter = await Chapter.findById(chapterObjectId);

      if (!chapter) {
        return res.status(404).json({
          success: false,
          message: "Chapter not found",
        });
      }

      const chapterMembers = await Member.find({
        "chapterInfo.chapterId": chapterObjectId,
        isDelete: 0,
      }).select("_id");
      const memberIds = chapterMembers.map((member) => member._id);

      if (memberIds.length === 0) {
        return res.status(200).json({
          success: true,
          message: "Chapter has no members, so no statistics are available.",
          data: {
            referralSlips: { topPerformer: null },
            visitors: { topPerformer: null },
            oneToOneMeetings: { topPerformer: null },
            testimonialSlips: { topPerformer: null },
            thankYouSlips: { topPerformer: null },
          },
        });
      }

      const currentDate = new Date();
      const startDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      const endDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      );

      const getTopPerformer = async (
        model: mongoose.Model<any>,
        matchField: string,
        groupField: string
      ) => {
        const results = await model.aggregate([
          {
            $match: {
              [matchField]: { $in: memberIds },
              isDelete: 0,
              createdAt: { $gte: startDate, $lte: endDate },
            },
          },
          {
            $group: {
              _id: `$${groupField}`,
              count: { $sum: 1 },
              amount: { $sum: "$amount" }, // For thank you slips which have amounts
            },
          },
          { $sort: { count: -1, amount: -1 } },
          { $limit: 1 },
          {
            $lookup: {
              from: "members",
              localField: "_id",
              foreignField: "_id",
              as: "memberDetails",
            },
          },
          { $unwind: "$memberDetails" },
          {
            $project: {
              _id: 0,
              memberId: "$_id",
              name: {
                $concat: [
                  "$memberDetails.personalDetails.firstName",
                  " ",
                  {
                    $ifNull: ["$memberDetails.personalDetails.lastName", ""],
                  },
                ],
              },
              categoryRepresented:
                "$memberDetails.personalDetails.categoryRepresented",
              profileImage: "$memberDetails.personalDetails.profileImage",
              count: "$count",
              amount: { $ifNull: ["$amount", 0] },
            },
          },
        ]);
        return results[0] || null;
      };

      // ⭐ FETCH MANUALLY SAVED TOP ACHIEVERS
      const savedTopAchiever = await TopAchiver.findOne({ chapterId })
        .populate({
          path: "referrals",
          select:
            "personalDetails.firstName personalDetails.lastName personalDetails.categoryRepresented personalDetails.profileImage",
        })

        .populate({
          path: "business",
          select:
            "personalDetails.firstName personalDetails.lastName personalDetails.categoryRepresented personalDetails.profileImage",
        })

        .populate({
          path: "visitors",
          select:
            "personalDetails.firstName personalDetails.lastName personalDetails.categoryRepresented personalDetails.profileImage",
        });

      // ⭐ FORMAT MEMBER RESPONSE
      const formatMember = (member: any) => {
        if (!member) return null;

        return {
          memberId: member._id,
          name: `${member.personalDetails.firstName} ${
            member.personalDetails.lastName || ""
          }`,
          categoryRepresented: member.personalDetails.categoryRepresented,
          profileImage: member.personalDetails.profileImage || null,
        };
      };

      const [
        topReferralGiver,
        topVisitorBringer,
        topOneToOneMember,
        topTestimonialReceiver,
        topThankYouReceiver,
      ] = await Promise.all([
        getTopPerformer(ReferralSlipModel, "fromMember", "fromMember"),
        getTopPerformer(Visitor, "invitedBy", "invitedBy"),
        getTopPerformer(OneToOne, "fromMember", "fromMember"),
        getTopPerformer(TestimonialSlip, "toMember", "toMember"),
        getTopPerformer(ThankYouSlip, "toMember", "toMember"),
      ]);

      // ⭐ FINAL RESPONSE
      return res.status(200).json({
        success: true,
        message: "Top performers of the month fetched successfully",
        data: {
          referralSlips: { topPerformer: topReferralGiver },
          visitors: { topPerformer: topVisitorBringer },
          oneToOneMeetings: { topPerformer: topOneToOneMember },
          testimonialSlips: { topPerformer: topTestimonialReceiver },
          thankYouSlips: { topPerformer: topThankYouReceiver },

          // ⭐ ADD YOUR MANUALLY SAVED ACHIEVERS
          topAchievers: {
            referrals: formatMember(savedTopAchiever?.referrals),
            business: formatMember(savedTopAchiever?.business),
            visitors: formatMember(savedTopAchiever?.visitors),
          },
        },
      });
    } catch (error) {
      console.error(
        `Error fetching top performers for chapter ${chapterId}:`,
        error
      );
      return res.status(500).json({
        success: false,
        message: "Failed to fetch top performers",
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }

  @Get("/headTableUsers/:chapterId")
  async getHeadTableUsers(
    @Param("chapterId") chapterId: string,
    @Res() res: Response
  ) {
    try {
      const chapter = await Chapter.findById(chapterId);
      if (!chapter) {
        return res.status(404).json({
          success: false,
          message: "Chapter not found",
        });
      }

      const cidIds = chapter.cidId || [];
      const mentorId = chapter.mentorId;

      const userIds = mentorId ? [...cidIds, mentorId] : cidIds;

      const userPipeline = [
        { $match: { _id: { $in: userIds } } },
        { $addFields: { role_id: { $toObjectId: "$role" } } },
        {
          $lookup: {
            from: "roles",
            localField: "role_id",
            foreignField: "_id",
            as: "roleDetails",
          },
        },
        { $unwind: { path: "$roleDetails", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            name: "$name",
            companyName: "$companyName",
            mobileNumber: "$mobileNumber",
            email: "$email",
            roleName: { $ifNull: ["$roleDetails.name", "N/A"] },
            profileImage: { $ifNull: ["$profileImage", null] },
          },
        },
      ];

      const userResult = await User.aggregate(userPipeline);

      return res.status(200).json({
        success: true,
        message: "Head table users fetched successfully",
        data: userResult,
      });
    } catch (error) {
      console.error(
        `Error fetching head table users for chapter ${chapterId}:`,
        error
      );
      return res.status(500).json({
        success: false,
        message: "Failed to fetch head table users",
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  }

  // @Get("/headTableMembers/:chapterId")
  // async getHeadTableMembers(
  //   @Param("chapterId") chapterId: string,
  //   @Res() res: Response
  // ) {
  //   try {
  //     const chapter = await Chapter.findById(chapterId);
  //     if (!chapter) {
  //       return res.status(404).json({
  //         success: false,
  //         message: "Chapter not found",
  //       });
  //     }
  //     const memberPipeline = [
  //       {
  //         $match: {
  //           "chapterInfo.chapterId": new mongoose.Types.ObjectId(chapterId),
  //           isHeadtable: true,
  //           isDelete: 0,
  //         },
  //       },
  //       {
  //         $lookup: {
  //           from: "roles",
  //           localField: "role",
  //           foreignField: "_id",
  //           as: "roleDetails",
  //         },
  //       },
  //       { $unwind: { path: "$roleDetails", preserveNullAndEmptyArrays: true } },
  //       {
  //         $project: {
  //           _id: 0,
  //           name: {
  //             $concat: [
  //               "$personalDetails.firstName",
  //               " ",
  //               "$personalDetails.lastName",
  //             ],
  //           },

  //           companyName: "$personalDetails.companyName",
  //           mobileNumber: "$contactDetails.mobileNumber",
  //           email: "$contactDetails.email",
  //           roleName: { $ifNull: ["$roleDetails.name", "N/A"] },
  //           profileImage: { $ifNull: ["$personalDetails.profileImage", null] },
  //         },
  //       },
  //     ];

  //     const headTableMembers = await Member.aggregate(memberPipeline);

  //     return res.status(200).json({
  //       success: true,
  //       message: "Head table members fetched successfully",
  //       data: headTableMembers,
  //     });
  //   } catch (error) {
  //     console.error(
  //       `Error fetching head table members for chapter ${chapterId}:`,
  //       error
  //     );
  //     return res.status(500).json({
  //       success: false,
  //       message: "Failed to fetch head table members",
  //       error:
  //         error instanceof Error ? error.message : "An unknown error occurred",
  //     });
  //   }
  // }

  @Get("/headTableMembers/:chapterId")
  @UseBefore(AuthMiddleware)
  async getHeadTableMembers(
    @Param("chapterId") chapterId: string,
    @Res() res: Response
  ) {
    try {
      // Validate chapter exists
      const chapter = await Chapter.findById(chapterId);
      if (!chapter) {
        return res.status(404).json({
          success: false,
          message: "Chapter not found",
        });
      }

      // Fetch ONLY from headtables collection
      const headTableData = await HeadTable.find({ chapterId })
        .populate({
          path: "panelAssociateId",
          select: `
            personalDetails.firstName 
            personalDetails.lastName 
            personalDetails.companyName 
            personalDetails.profileImage 
            contactDetails.mobileNumber 
            contactDetails.email
          `,
        })
        .populate({
          path: "roleId",
          select: "name",
        })
        .lean();

      // Format response
      const formatted = headTableData.map((ht: any) => {
        const m = ht.panelAssociateId;

        return {
          name: `${m.personalDetails.firstName} ${m.personalDetails.lastName}`,
          companyName: m.personalDetails.companyName || "",
          mobileNumber: m.contactDetails.mobileNumber || "",
          email: m.contactDetails.email || "",
          profileImage: m.personalDetails.profileImage || null,
          roleName: ht.position || ht?.roleId?.name || "N/A",
        };
      });

      return res.status(200).json({
        success: true,
        message: "Head table members fetched successfully",
        data: formatted,
      });
    } catch (error) {
      console.error("Error fetching head table members:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch head table members",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Public version (skips token validation)
  @Get("/by-zone/public/:zoneId")
  async getChaptersByZonePublic(
    @Param("zoneId") zoneId: string,
    @Res() res: Response
  ) {
    try {
      const zone = await Zone.findById(zoneId);
      if (!zone) {
        return res.status(404).json({
          success: false,
          message: "Zone not found",
        });
      }

      const chapters = await Chapter.find({
        zoneId: zoneId,
        isDelete: 0,
      })
        .populate("cidId", "name email phoneNumber")
        .sort({ chapterName: 1 });

      return res.status(200).json({
        success: true,
        message: "Chapters fetched successfully (public)",
        data: chapters,
        zoneInfo: {
          zoneId: zone._id,
          zoneName: zone.zoneName,
          countryName: zone.countryName,
          stateName: zone.stateName,
        },
      });
    } catch (error: unknown) {
      console.error("Error fetching chapters by zone (public):", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch chapters by zone (public)",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
