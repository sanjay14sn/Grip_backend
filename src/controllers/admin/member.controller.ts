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
  Patch,
  NotFoundError,
  BadRequestError,
  InternalServerError,
  UseBefore,
  Req,
} from "routing-controllers";
import { Response } from "express";
import {
  CreateMemberDto,
  UpdateMemberDto,
  UpdateMemberStatusDto,
  UpdateMemberTypeDto,
  CreateMemberbychapterDto,
} from "../../dto/create-member.dto";
import { Chapter } from "../../models/chapter.model";
import { ListMembersDto } from "../../dto/list-member.dto";
import { UpdatePinDto } from "../../dto/update-pin.dto";
import { Member } from "../../models/member.model";
import mongoose, { Types } from "mongoose";
import { AuthMiddleware } from "../../middleware/AuthorizationMiddleware";
import Payment from "../../models/payment.model";

@JsonController("/api/admin/members")
@UseBefore(AuthMiddleware)
export default class MemberController {
  @Post("/")
  async createMember(
    @Body({ validate: true }) memberData: CreateMemberDto,
    @Res() res: Response,
    @Req() req: Request
  ) {
    // try {
    // Trim string fields
    if (memberData.chapterInfo?.countryName) {
      memberData.chapterInfo.countryName =
        memberData.chapterInfo.countryName.trim();
    }
    if (memberData.chapterInfo?.stateName) {
      memberData.chapterInfo.stateName =
        memberData.chapterInfo.stateName.trim();
    }

    const member = new Member({
      ...memberData,
      status: "active",
      isActive: memberData.isActive ?? 1,
      isDelete: memberData.isDelete ?? 0,
      createdBy: (req as any).user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedMember = await member.save();
    return res.status(201).json({
      success: true,
      message: "Member created successfully",
      data: savedMember,
    });
    // } catch (error: unknown) {
    //   console.error("Error creating member:", error);
    //   if ((error as any).code === 11000) {
    //     throw new BadRequestError(
    //       "Member with this mobile number already exists"
    //     );
    //   }
    //   throw new InternalServerError("Failed to create member");
    // }
  }

  @Post("/by-chapter")
  async createMemberByChapter(
    @Body({ validate: true }) memberData: CreateMemberbychapterDto,
    @Res() res: Response,
    @Req() req: Request
  ) {
    try {
      const chapter = await Chapter.findById(memberData.chapterId);
      if (!chapter) {
        throw new NotFoundError("Chapter not found");
      }

      const chapterInfo = {
        countryName: chapter.countryName,
        stateName: chapter.stateName,
        zoneId: chapter.zoneId,
        chapterId: chapter._id,
        CIDId: chapter.cidId,
        whoInvitedYou: memberData.whoInvitedYou,
        howDidYouHearAboutGRIP: memberData.howDidYouHearAboutGRIP,
      };

      const member = new Member({
        ...memberData,
        chapterInfo,
        status: "active",
        isActive: memberData.isActive ?? 1,
        isDelete: memberData.isDelete ?? 0,
        createdBy: (req as any).user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedMember = await member.save();
      return res.status(201).json({
        success: true,
        message: "Member created successfully",
        data: savedMember,
      });
    } catch (error: unknown) {
      console.error("Error creating member:", error);
      if ((error as any).code === 11000) {
        throw new BadRequestError(
          "Member with this mobile number already exists"
        );
      }
      throw new InternalServerError("Failed to create member");
    }
  }

  @Get("/list")
  async listMembers(
    @QueryParams() query: ListMembersDto,
    @Res() res: Response
  ) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        sort = "desc",
        sortBy = "createdAt",
        countryName,
        stateName,
        zoneId,
        chapterId,
        CIDId,
      } = query;

      const skip = (page - 1) * limit;
      const queryConditions: any = { isDelete: 0, status: "active" };

      // Add filters for country, state, zone, chapter, and CID
      if (countryName) {
        queryConditions["chapterInfo.countryName"] = new RegExp(
          `^${countryName}$`,
          "i"
        );
      }
      if (stateName) {
        queryConditions["chapterInfo.stateName"] = new RegExp(
          `^${stateName}$`,
          "i"
        );
      }
      if (zoneId) {
        queryConditions["chapterInfo.zoneId"] = zoneId;
      }
      if (chapterId) {
        queryConditions["chapterInfo.chapterId"] = chapterId;
      }
      if (CIDId) {
        queryConditions["chapterInfo.CIDId"] = CIDId;
      }

      if (search) {
        const searchRegex = new RegExp(search, "i");
        queryConditions.$or = [
          { "personalDetails.firstName": searchRegex },
          { "personalDetails.lastName": searchRegex },
          { "contactDetails.email": searchRegex },
          { "contactDetails.mobileNumber": searchRegex },
          { "chapterInfo.countryName": searchRegex },
          { "chapterInfo.stateName": searchRegex },
        ];
      }

      const [members, total] = await Promise.all([
        Member.find(queryConditions)
          .sort({ [sortBy]: sort === "desc" ? -1 : 1 })
          .skip(skip)
          .limit(limit)
          .populate("chapterInfo.zoneId", "zoneName")
          .populate("chapterInfo.chapterId", "chapterName")
          .populate("chapterInfo.CIDId", "name email")
          .lean(),
        Member.countDocuments(queryConditions),
      ]);

      return res.status(200).json({
        success: true,
        message: "Members fetched successfully",
        data: members,
        pagination: {
          total,
          page,
          totalPages: Math.ceil(total / limit),
          limit,
        },
      });
    } catch (error: unknown) {
      console.error("Error listing members:", error);
      throw new InternalServerError("Failed to fetch members");
    }
  }

  @Get("/approvalList")
  async listPendingAndDeclinedMembers(
    @QueryParams() query: ListMembersDto,
    @Res() res: Response
  ) {
    try {
      const {
        page = query.page || 1,
        limit = query.limit || 100,
        search,
        sort = "desc",
        sortBy = "createdAt",
        countryName,
        stateName,
        zoneId,
        chapterId,
        CIDId,
      } = query;

      const skip = (page - 1) * limit;
      const queryConditions: any = { isDelete: 0, status: { $in: ["pending", "decline"] } };

      if (countryName) {
        queryConditions["chapterInfo.countryName"] = new RegExp(
          `^${countryName}$`,
          "i"
        );
      }
      if (stateName) {
        queryConditions["chapterInfo.stateName"] = new RegExp(
          `^${stateName}$`,
          "i"
        );
      }
      if (zoneId) {
        queryConditions["chapterInfo.zoneId"] = zoneId;
      }
      if (chapterId) {
        queryConditions["chapterInfo.chapterId"] = chapterId;
      }
      if (CIDId) {
        queryConditions["chapterInfo.CIDId"] = CIDId;
      }

      if (search) {
        const searchRegex = new RegExp(search, "i");
        queryConditions.$or = [
          { "personalDetails.firstName": searchRegex },
          { "personalDetails.lastName": searchRegex },
          { "contactDetails.email": searchRegex },
          { "contactDetails.mobileNumber": searchRegex },
          { "chapterInfo.countryName": searchRegex },
          { "chapterInfo.stateName": searchRegex },
        ];
      }

      const [members, total] = await Promise.all([
        Member.find(queryConditions)
          .sort({ [sortBy]: sort === "desc" ? -1 : 1 })
          .skip(skip)
          .limit(limit)
          .populate("chapterInfo.zoneId", "zoneName")
          .populate("chapterInfo.chapterId", "chapterName")
          .populate("chapterInfo.CIDId", "name email")
          .lean(),
        Member.countDocuments(queryConditions),
      ]);

      const formattedMembers = members.map((member) => ({
        ...member,
        id: member._id,
        name: `${member.personalDetails?.firstName || ""} ${member.personalDetails?.lastName || ""
          }`.trim(),
      }));

      return res.status(200).json({
        success: true,
        message: "Members fetched successfully",
        data: {
          members: formattedMembers,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error: unknown) {
      console.error("Error listing members:", error);
      throw new InternalServerError("Failed to list members");
    }
  }

  @Get("/:id")
  async getMember(@Param("id") id: string, @Res() res: Response) {
    try {
      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Invalid member ID");
      }

      const pipeline = [
        {
          $match: {
            _id: new mongoose.Types.ObjectId(id),
            isDelete: 0,
          },
        },
        {
          $lookup: {
            from: "zones",
            localField: "chapterInfo.zoneId",
            foreignField: "_id",
            as: "chapterInfo.zoneId",
          },
        },
        {
          $unwind: {
            path: "$chapterInfo.zoneId",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            "chapterInfo.zoneId": {
              zoneName: "$chapterInfo.zoneId.zoneName",
            },
          },
        },
        {
          $lookup: {
            from: "chapters",
            localField: "chapterInfo.chapterId",
            foreignField: "_id",
            as: "chapterInfo.chapterId",
          },
        },
        {
          $unwind: {
            path: "$chapterInfo.chapterId",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            "chapterInfo.chapterId": {
              chapterName: "$chapterInfo.chapterId.chapterName",
            },
          },
        },
        {
          $lookup: {
            from: "cids",
            localField: "chapterInfo.CIDId",
            foreignField: "_id",
            as: "chapterInfo.CIDId",
          },
        },
        {
          $unwind: {
            path: "$chapterInfo.CIDId",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            "chapterInfo.CIDId": {
              name: "$chapterInfo.CIDId.name",
              email: "$chapterInfo.CIDId.email",
            },
          },
        },
        {
          $limit: 1,
        },
      ];

      const result = await Member.aggregate(pipeline);

      if (result.length === 0) {
        throw new NotFoundError("Member not found");
      }

      return res.status(200).json({
        success: true,
        message: "Member fetched successfully",
        data: result[0],
      });
    } catch (error: unknown) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      console.error("Error fetching member:", error);
      throw new InternalServerError("Failed to fetch member");
    }
  }

  @Put("/:id")
  async updateMember(
    @Param("id") id: string,
    @Body({ validate: true }) memberData: UpdateMemberDto,
    @Res() res: Response,
    @Req() req: Request
  ) {
    try {
      const existingMember = await Member.findById(id);
      if (!existingMember) {
        throw new NotFoundError("Member not found");
      }

      // Trim string fields
      if (memberData.chapterInfo?.countryName) {
        memberData.chapterInfo.countryName =
          memberData.chapterInfo.countryName.trim();
      }
      if (memberData.chapterInfo?.stateName) {
        memberData.chapterInfo.stateName =
          memberData.chapterInfo.stateName.trim();
      }

      Object.assign(existingMember, memberData);
      existingMember.updatedAt = new Date();
      existingMember.updatedBy = (req as any).user.id;
      const updatedMember = await existingMember.save();

      return res.status(200).json({
        success: true,
        message: "Member updated successfully",
        data: updatedMember,
      });
    } catch (error: unknown) {
      console.error("Error updating member:", error);
      if ((error as any).name === "CastError") {
        throw new BadRequestError("Invalid member ID");
      }
      if ((error as any).code === 11000) {
        throw new BadRequestError(
          "Member with this Mobile Number already exists"
        );
      }
      throw new InternalServerError(
        "Failed to update member: " +
        (error instanceof Error ? error.message : JSON.stringify(error))
      );
    }
  }

  @Delete("/:id")
  async deleteMember(
    @Param("id") id: string,
    @Res() res: Response,
    @Req() req: Request
  ) {
    try {
      const member = await Member.findByIdAndUpdate(
        id,
        {
          isDelete: 1,
          deletedAt: new Date(),
          deletedBy: (req as any).user.id,
        },
        { new: true }
      );

      if (!member) {
        throw new NotFoundError("Member not found");
      }

      return res.status(200).json({
        success: true,
        message: "Member deleted successfully",
      });
    } catch (error: unknown) {
      console.error("Error deleting member:", error);
      if ((error as any).name === "CastError") {
        throw new BadRequestError("Invalid member ID");
      }
      throw new InternalServerError("Failed to delete member");
    }
  }

  @Patch("/:id/pin")
  async updatePin(
    @Param("id") id: string,
    @Body({ validate: true }) updatePinDto: UpdatePinDto,
    @Res() res: Response
  ) {
    try {
      const member = await Member.findById(id);

      if (!member) {
        return res.status(404).json({
          success: false,
          message: "Member not found",
        });
      }

      // Verify current PIN with bcrypt
      const bcrypt = require("bcrypt");
      const isMatch = await bcrypt.compare(updatePinDto.currentPin, member.pin);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Current PIN is incorrect",
        });
      }

      // const salt = await bcrypt.genSalt(10);
      member.pin = updatePinDto.newPin;
      member.updatedAt = new Date();
      await member.save();

      return res.status(200).json({
        success: true,
        message: "PIN updated successfully",
      });
    } catch (error: unknown) {
      console.error("Error updating PIN:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update PIN",
      });
    }
  }
  @Get("/by-chapter/:chapterId")
  async getMembersByChapterId(
    @QueryParams() query: ListMembersDto,
    @Param("chapterId") chapterId: string,
    @Res() res: Response
  ) {
    try {
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 100;
      const skip = (page - 1) * limit;
      const search = query.search || "";

      const matchStage: any = {
        "chapterInfo.chapterId": new Types.ObjectId(chapterId),
        isDelete: 0,
      };

      if (search) {
        matchStage.$or = [
          { "personalDetails.firstName": { $regex: search, $options: "i" } },
          { "personalDetails.lastName": { $regex: search, $options: "i" } },
        ];
      }

      const membersAgg = await Member.aggregate([
        { $match: matchStage },
        {
          $addFields: {
            name: {
              $trim: {
                input: {
                  $concat: [
                    { $ifNull: ["$personalDetails.firstName", ""] },
                    " ",
                    { $ifNull: ["$personalDetails.lastName", ""] },
                  ],
                },
              },
            },
          },
        },

        { $sort: { createdAt: -1 } },

        {
          $facet: {
            metadata: [{ $count: "total" }],
            data: [{ $skip: skip }, { $limit: limit }],
          },
        },

        { $unwind: { path: "$metadata", preserveNullAndEmptyArrays: true } },

        {
          $project: {
            members: "$data",
            total: { $ifNull: ["$metadata.total", 0] },
          },
        },
      ]);

      const result = membersAgg[0] || { members: [], total: 0 };

      return res.status(200).json({
        success: true,
        data: {
          members: result.members,
          pagination: {
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit),
          },
        },
      });
    } catch (error: unknown) {
      console.error("Error fetching members by chapter:", error);
      throw new InternalServerError("Failed to fetch members by chapter");
    }
  }


  @Get("/by-meeting/:MeetingId")
  async getMembersByMeetingId(
    @Param("MeetingId") MeetingId: string,
    @QueryParams() query: { search?: string; page?: number; limit?: number },
    @Res() res: Response
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 100;
    const skip = (page - 1) * limit;
    const search = query.search || "";

    const meeting = await Payment.findById(MeetingId);
    if (!meeting) {
      throw new NotFoundError("Meeting not found");
    }

    const match: any = {
      isDelete: 0,
      "chapterInfo.chapterId": { $in: meeting.chapterId },
    };

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      match.$or = [
        { 'personalDetails.firstName': searchRegex },
        { 'personalDetails.lastName': searchRegex },
        { 'personalDetails.email': searchRegex },
        { 'personalDetails.mobileNumber': searchRegex },
      ];
    }

    const pipeline: any = [
      { $match: match },
      {
        $lookup: {
          from: "chapters",
          localField: "chapterInfo.chapterId",
          foreignField: "_id",
          as: "chapter"
        }
      },
      {
        $unwind: {
          path: "$chapter",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "zones",
          localField: "chapterInfo.zoneId",
          foreignField: "_id",
          as: "zone"
        }
      },
      {
        $unwind: {
          path: "$zone",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "attendances",
          let: {
            memberId: "$_id"
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$memberId", "$$memberId"]
                    },
                    {
                      $eq: ["$meetingId", meeting._id]
                    },
                    {
                      $eq: ["$isDelete", 0]
                    }
                  ]
                }
              }
            },
            {
              $project: {
                status: 1,
                _id: 0
              }
            }
          ],
          as: "attendanceInfo"
        }
      },
      {
        $addFields: {
          attendanceStatus: {
            $arrayElemAt: [
              "$attendanceInfo.status",
              0
            ]
          }
        }
      },
      {
        $project: {
          name: {
            $concat: [
              "$personalDetails.firstName",
              " ",
              "$personalDetails.lastName"
            ]
          },
          meetingName: meeting.topic,
          chapterName: "$chapter.chapterName",
          mobileNumber: "$contactDetails.mobileNumber",
          companyName: "$personalDetails.companyName",
          categoryRepresented: "$personalDetails.categoryRepresented",
          status: "$attendanceStatus"
        }
      }
    ];

    const countResult = await Member.aggregate([...pipeline, { $count: "total" }]);
    const total = countResult?.[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    pipeline.push({ $skip: skip }, { $limit: limit });

    // Get paginated results
    const members = await Member.aggregate(pipeline);

    // Final response
    return res.status(200).json({
      success: true,
      message: "Members fetched successfully",
      data: members,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  }

  @Patch("/status/:id")
  async updateStatus(
    @Param("id") id: string,
    @Body() body: UpdateMemberStatusDto,
    @Res() res: Response,
    @Req() req: Request
  ) {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new BadRequestError("Invalid member ID format");
      }
      const member = await Member.findById(id);
      if (!member || member.isDelete === 1) {
        throw new NotFoundError("Member not found");
      }

      if (body.status) {
        member.status = body.status;
      }
      member.updatedAt = new Date();
      member.updatedBy = (req as any).user.id;
      await member.save();
      return res.status(200).json({
        success: true,
        message: "Member status updated successfully",
        data: { id: member._id, status: member.status },
      });
    } catch (error: unknown) {
      console.error("Error updating member status:", error);
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      return res.status(500).json({
        success: false,
        message: "Failed to update member status",
      });
    }
  }

  @Patch("/type/:id")
  async updateTypeAndRole(
    @Param("id") id: string,
    @Body() body: UpdateMemberTypeDto,
    @Res() res: Response,
    @Req() req: Request
  ) {
    try {
      const member = await Member.findById(id);
      if (!member || member.isDelete === 1) {
        throw new NotFoundError("Member not found");
      }
      if (body.type) {
        member.type = body.type;
        if (body.type.toLowerCase() === "member") {
          member.isHeadtable = false;
          member.role = undefined;
        } else {
          member.isHeadtable = true;
          if (body.role) {
            member.role = new Types.ObjectId(body.role);
          }
        }
      }

      member.updatedAt = new Date();
      member.updatedBy = (req as any).user.id;
      await member.save();
      return res.status(200).json({
        success: true,
        message: "Member type and role updated successfully",
        data: member,
      });
    } catch (error: unknown) {
      console.error("Error updating member type and role:", error);
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      return res.status(500).json({
        success: false,
        message: "Failed to update member type and role",
      });
    }
  }

  @Get("/cidbychapter/:chapterId")
  async getCidByChapterId(
    @Param("chapterId") chapterId: string,
    @Res() res: Response
  ) {
    try {
      const chapter = await Chapter.findById(chapterId);
      if (!chapter) {
        throw new NotFoundError("Chapter not found");
      }

      const cid = chapter.cidId;
      console.log(cid, "cid");
      return res.status(200).json({
        success: true,
        data: cid,
      });
    } catch (error: unknown) {
      console.error("Error fetching CID by chapter:", error);
      throw new InternalServerError("Failed to fetch CID by chapter");
    }
  }
}
