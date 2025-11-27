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
  Req,
  UseBefore,
} from "routing-controllers";
import { Response, Request } from "express";
import {
  CreateMemberDto,
  UpdateMemberDto,
} from "../../dto/create-member.dto";
import { ListMembersDto } from "../../dto/list-member.dto";
import { UpdatePinDto } from "../../dto/update-pin.dto";
import { Member } from "../../models/member.model";
import mongoose, { Types } from "mongoose";
import bcrypt from "bcrypt";
import { AuthMiddleware } from "../../middleware/AuthorizationMiddleware";
import { UpdateProfileMemberDto } from "../../dto/update-profile-member.dto";
import { OneToOne } from "../../models/onetoone.model";
import { ReferralSlipModel } from "../../models/referralslip.model";
import { Visitor } from "../../models/visitor.model";
import ThankYouSlip from "../../models/thankyouslip.model";
import { TestimonialSlip } from "../../models/testimonialslip.model";
import { Attendance } from "../../models/attendance.model";

@JsonController("/api/mobile/members")
export default class MemberController {
  @Get("/by-chapter/:chapterId")
  async getMembersByChapterId(
    @Param("chapterId") chapterId: string,
    @QueryParams() query: ListMembersDto,
    @Res() res: Response
  ) {
    try {
      const { search, sort = "desc", sortBy = "createdAt" } = query;

      const queryConditions: any[] = [
        { $match: { isDelete: 0, status: "active" } },
      ];

      if (chapterId) {
        if (!Types.ObjectId.isValid(chapterId))
          throw new BadRequestError("Invalid chapter ID format");
        queryConditions[0].$match["chapterInfo.chapterId"] = new Types.ObjectId(
          chapterId
        );
      }

      if (search) {
        const searchRegex = new RegExp(search, "i");
        queryConditions[0].$match.$or = [
          { "personalDetails.firstName": searchRegex },
          { "personalDetails.lastName": searchRegex },
          { "contactDetails.email": searchRegex },
          { "contactDetails.mobileNumber": searchRegex },
          { "chapterInfo.countryName": searchRegex },
          { "chapterInfo.stateName": searchRegex },
        ];
      }

      const lookupStages = [
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
      ];

      const sortStage = {
        $sort: { [sortBy]: sort === "desc" ? -1 : 1 },
      };
      const pipeline = [...queryConditions, ...lookupStages, sortStage];

      const members = await Member.aggregate(pipeline);

      return res.status(200).json({
        success: true,
        message: "Members fetched successfully",
        data: members,
      });
    } catch (error: unknown) {
      console.error("Error fetching members:", error);
      if (error instanceof BadRequestError) {
        throw error;
      }
      throw new InternalServerError("Failed to fetch members");
    }
  }


  // Public version (skips token validation)
  @Get("/by-chapter/public/:chapterId")
  async getMembersByChapterIdPublic(
    @Param("chapterId") chapterId: string,
    @QueryParams() query: ListMembersDto,
    @Res() res: Response
  ) {
    try {
      const { search, sort = "desc", sortBy = "createdAt" } = query;

      const queryConditions: any[] = [
        { $match: { isDelete: 0, status: "active" } },
      ];

      if (chapterId) {
        if (!Types.ObjectId.isValid(chapterId))
          return res.status(400).json({ success: false, message: "Invalid chapter ID format" });
        queryConditions[0].$match["chapterInfo.chapterId"] = new Types.ObjectId(chapterId);
      }

      if (search) {
        const searchRegex = new RegExp(search, "i");
        queryConditions[0].$match.$or = [
          { "personalDetails.firstName": searchRegex },
          { "personalDetails.lastName": searchRegex },
          { "contactDetails.email": searchRegex },
          { "contactDetails.mobileNumber": searchRegex },
          { "chapterInfo.countryName": searchRegex },
          { "chapterInfo.stateName": searchRegex },
        ];
      }

      const lookupStages = [
        {
          $lookup: {
            from: "zones",
            localField: "chapterInfo.zoneId",
            foreignField: "_id",
            as: "chapterInfo.zoneId",
          },
        },
        { $unwind: { path: "$chapterInfo.zoneId", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "chapters",
            localField: "chapterInfo.chapterId",
            foreignField: "_id",
            as: "chapterInfo.chapterId",
          },
        },
        { $unwind: { path: "$chapterInfo.chapterId", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "cids",
            localField: "chapterInfo.CIDId",
            foreignField: "_id",
            as: "chapterInfo.CIDId",
          },
        },
        { $unwind: { path: "$chapterInfo.CIDId", preserveNullAndEmptyArrays: true } },
      ];

      const sortStage = { $sort: { [sortBy]: sort === "desc" ? -1 : 1 } };
      const pipeline = [...queryConditions, ...lookupStages, sortStage];

      const members = await Member.aggregate(pipeline);

      return res.status(200).json({
        success: true,
        message: "Members fetched successfully (public)",
        data: members,
      });
    } catch (error: unknown) {
      console.error("Error fetching members (public):", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch members (public)",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  @Post("/")
  async createMember(
    // @Body({ validate: true })
    @Body({ validate: { whitelist: true, forbidNonWhitelisted: false } })
    memberData: CreateMemberDto,
    @Res() res: Response
  ) {
    try {
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
        status: "pending",
        isActive: memberData.isActive ?? 1,
        isDelete: memberData.isDelete ?? 0,
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
    const {
      page,
      limit,
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
    const queryConditions: any[] = [{ $match: { isDelete: 0 } }];

    if (countryName) {
      queryConditions[0].$match["chapterInfo.countryName"] = new RegExp(
        `^${countryName}$`,
        "i"
      );
    }
    if (stateName) {
      queryConditions[0].$match["chapterInfo.stateName"] = new RegExp(
        `^${stateName}$`,
        "i"
      );
    }
    if (zoneId) {
      queryConditions[0].$match["chapterInfo.zoneId"] = zoneId;
    }
    if (chapterId) {
      queryConditions[0].$match["chapterInfo.chapterId"] = chapterId;
    }
    if (CIDId) {
      queryConditions[0].$match["chapterInfo.CIDId"] = CIDId;
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      queryConditions[0].$match.$or = [
        { "personalDetails.firstName": searchRegex },
        { "personalDetails.lastName": searchRegex },
        { "contactDetails.email": searchRegex },
        { "contactDetails.mobileNumber": searchRegex },
        { "chapterInfo.countryName": searchRegex },
        { "chapterInfo.stateName": searchRegex },
      ];
    }

    const lookupStages = [
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
    ];

    const sortStage = {
      $sort: { [sortBy]: sort === "desc" ? -1 : 1 },
    };
    const facetStage = {
      $facet: {
        members: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: "count" }],
      },
    };

    const projectStage = {
      $project: {
        members: 1,
        total: { $arrayElemAt: ["$total.count", 0] },
      },
    };

    const pipeline = [
      ...queryConditions,
      ...lookupStages,
      sortStage,
      facetStage,
      projectStage,
    ];

    const [result] = await Member.aggregate(pipeline);

    return res.status(200).json({
      success: true,
      message: "Members fetched successfully",
      data: result.members || [],
      pagination: {
        total: result.total || 0,
        page,
        totalPages: Math.ceil((result.total || 0) / limit),
        limit,
      },
    });
  }

  @Get("/profile-Completion-Percentage/:memberId")
  async profileCompletionPercentage(
    @Param("memberId") memberId: string,
    @Res() res: Response
  ) {
    const pipeline = [
      {
        $match: {
          _id: new Types.ObjectId(memberId), // ✅ correct match
          isDelete: 0, // optional safeguard
        },
      },
      {
        $project: {
          _id: 0,
          profileCompletion: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      {
                        $size: {
                          $filter: {
                            input: [
                              "$personalDetails.firstName",
                              "$personalDetails.lastName",
                              "$contactDetails.email",
                              "$contactDetails.mobileNumber",
                              "$personalDetails.profileImage.docName",
                              "$personalDetails.companyName",
                            ],
                            as: "field",
                            cond: {
                              $and: [
                                { $ne: ["$$field", null] },
                                { $ne: ["$$field", ""] },
                              ],
                            },
                          },
                        },
                      },
                      6,
                    ],
                  },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
    ];

    const [result] = await Member.aggregate(pipeline);

    return res.status(200).json({
      success: true,
      message: "Member profile completion percentage fetched successfully",
      data: result || { profileCompletion: 0 }, // ✅ return object instead of result.members
    });
  }

  @Patch("/change-pin")
  @UseBefore(AuthMiddleware)
  async changePin(
    @Body({ validate: true }) body: UpdatePinDto,
    @Res() res: Response,
    @Req() req: Request
  ) {
    try {
      const { currentPin, newPin } = body;

      if (!currentPin || !newPin) {
        throw new BadRequestError("Old PIN and new PIN are required");
      }
      const memberId = (req as any).user.id;

      const member = await Member.findById(memberId);
      if (!member) {
        throw new BadRequestError("Member not found");
      }

      const isMatch = await bcrypt.compare(currentPin, member.pin);
      if (!isMatch) {
        throw new BadRequestError("Old PIN is incorrect");
      }

      member.pin = newPin;
      member.updatedAt = new Date();
      member.updatedBy = (req as any).user.id;

      await member.save();

      return res.status(200).json({
        success: true,
        message: "PIN changed successfully",
      });
    } catch (error) {
      console.error("Error changing PIN:", error);
      if (error instanceof BadRequestError) throw error;
      throw new InternalServerError("Failed to change PIN");
    }
  }

  @Get("/:id")
  async getMember(@Param("id") id: string, @Res() res: Response) {
    try {
      const member = await Member.findOne({ _id: id, isDelete: 0 })
        .populate("chapterInfo.zoneId", "zoneName")
        .populate("chapterInfo.chapterId", "chapterName")
        .populate("chapterInfo.CIDId", "name email");

      if (!member) {
        throw new NotFoundError("Member not found");
      }

      return res.status(200).json({
        success: true,
        message: "Member fetched successfully",
        data: member,
      });
    } catch (error: unknown) {
      if ((error as any).name === "CastError") {
        throw new BadRequestError("Invalid member ID");
      }
      throw error;
    }
  }

  @Put("/:id")
  async updateMember(
    @Param("id") id: string,
    // @Body({ validate: true })
    @Body({ validate: { whitelist: true, forbidNonWhitelisted: false } })
    memberData: UpdateMemberDto,
    @Res() res: Response
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

  @Put("/profile/update/:id")
  async updateProfileMember(
    @Param("id") id: string,
    @Body({ validate: true }) memberData: UpdateProfileMemberDto,
    @Res() res: Response,
    @Req() req: Request
  ) {
    try {
      const existingMember = await Member.findById(id);
      if (!existingMember) {
        throw new NotFoundError("Member not found");
      }

      // Update nested personalDetails
      if (memberData.personalDetails) {
        const { firstName, lastName, dob } = memberData.personalDetails;
        if (firstName) existingMember.personalDetails.firstName = firstName;
        if (lastName) existingMember.personalDetails.lastName = lastName;
        if (dob) existingMember.personalDetails.dob = new Date(dob);
      }

      // Update nested contactDetails
      if (memberData.contactDetails) {
        const { secondaryPhone, website } = memberData.contactDetails;
        if (secondaryPhone)
          existingMember.contactDetails.secondaryPhone = secondaryPhone;
        if (website) existingMember.contactDetails.website = website;
      }

      // Update nested businessAddress
      if (memberData.businessAddress) {
        const { addressLine1, addressLine2, city, state, postalCode } =
          memberData.businessAddress;
        if (addressLine1)
          existingMember.businessAddress.addressLine1 = addressLine1;
        if (addressLine2)
          existingMember.businessAddress.addressLine2 = addressLine2;
        if (city) existingMember.businessAddress.city = city;
        if (state) existingMember.businessAddress.state = state;
        if (postalCode) existingMember.businessAddress.postalCode = postalCode;
      }
      if (memberData.businessDetails) {
        const { businessDescription, yearsInBusiness } =
          memberData.businessDetails;
        if (businessDescription)
          existingMember.businessDetails.businessDescription =
            businessDescription;
        if (yearsInBusiness)
          existingMember.businessDetails.yearsInBusiness = yearsInBusiness;
      }

      existingMember.updatedAt = new Date();
      const updatedMember = await existingMember.save();

      return res.status(200).json({
        success: true,
        message: "Member updated successfully",
        data: {
          _id: updatedMember._id,
          personalDetails: {
            firstName: updatedMember.personalDetails.firstName,
            lastName: updatedMember.personalDetails.lastName,
            dob: updatedMember.personalDetails.dob,
          },
          businessAddress: {
            addressLine1: updatedMember.businessAddress.addressLine1,
            addressLine2: updatedMember.businessAddress.addressLine2,
            city: updatedMember.businessAddress.city,
            state: updatedMember.businessAddress.state,
            postalCode: updatedMember.businessAddress.postalCode,
          },
          businessDetails: {
            businessDescription:
              updatedMember.businessDetails?.businessDescription,
            yearsInBusiness: updatedMember.businessDetails?.yearsInBusiness,
          },
          contactDetails: {
            website: updatedMember.contactDetails.website,
            email: updatedMember.contactDetails.email,
          },
        },
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
  async deleteMember(@Param("id") id: string, @Res() res: Response) {
    try {
      const member = await Member.findByIdAndUpdate(
        id,
        {
          isDelete: 1,
          deletedAt: new Date(),
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
  @Get("/head-table/list")
  async headTableMembers(
    @QueryParams() query: ListMembersDto,
    @Res() res: Response
  ) {
    const {
      page,
      limit,
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
    const queryConditions: any[] = [
      { $match: { isDelete: 0, isHeadtable: true } },
    ];

    if (countryName) {
      queryConditions[0].$match["chapterInfo.countryName"] = new RegExp(
        `^${countryName}$`,
        "i"
      );
    }
    if (stateName) {
      queryConditions[0].$match["chapterInfo.stateName"] = new RegExp(
        `^${stateName}$`,
        "i"
      );
    }
    if (zoneId) {
      queryConditions[0].$match["chapterInfo.zoneId"] = zoneId;
    }
    if (chapterId) {
      queryConditions[0].$match["chapterInfo.chapterId"] = chapterId;
    }
    if (CIDId) {
      queryConditions[0].$match["chapterInfo.CIDId"] = CIDId;
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      queryConditions[0].$match.$or = [
        { "personalDetails.firstName": searchRegex },
        { "personalDetails.lastName": searchRegex },
        { "contactDetails.email": searchRegex },
        { "contactDetails.mobileNumber": searchRegex },
        { "chapterInfo.countryName": searchRegex },
        { "chapterInfo.stateName": searchRegex },
      ];
    }

    const lookupStages = [
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
    ];

    const sortStage = {
      $sort: { [sortBy]: sort === "desc" ? -1 : 1 },
    };
    const facetStage = {
      $facet: {
        members: [{ $skip: skip }, { $limit: limit }],
        total: [{ $count: "count" }],
      },
    };

    const projectStage = {
      $project: {
        members: 1,
        total: { $arrayElemAt: ["$total.count", 0] },
      },
    };

    const pipeline = [
      ...queryConditions,
      ...lookupStages,
      sortStage,
      facetStage,
      projectStage,
    ];

    const [result] = await Member.aggregate(pipeline);

    return res.status(200).json({
      success: true,
      message: "Members fetched successfully",
      data: result.members || [],
      pagination: {
        total: result.total || 0,
        page,
        totalPages: Math.ceil((result.total || 0) / limit),
        limit,
      },
    });
  }

  @Post("/meetings-attendance-count")
  async getMembersAttendanceCount(
    @Req() req: Request,
    @Body() body: { members: any[] | string },
    @Res() res: Response
  ) {
    let { members } = body;
    // --- NEW: handle "fromUser" ---
    if (members === "fromUser") {
      const currentUserId = (req as any).user?.id;
      if (!currentUserId) {
        return res.status(400).json({
          success: false,
          message: "Current user ID not found in token",
        });
      }
      members = [currentUserId]; // <-- normalize to array
    }

    // --- IF SINGLE STRING, CONVERT TO ARRAY ---
    if (typeof members === "string") {
      members = [members];
    }

    if (!members || members.length === 0) {
      return res.status(400).json({
        success: false,
        message: "memberIds are required",
      });
    }


    try {
      /* --------------------------------------------------
               1️⃣ Create ObjectId list
            -------------------------------------------------- */
      const memberObjIds = members.map(id => new mongoose.Types.ObjectId(id));

      /* --------------------------------------------------
         2️⃣ AGGREGATE ATTENDANCE
         Meeting → only after member joined
         Event/Training → always
      -------------------------------------------------- */
      const attendance = await Attendance.aggregate([
        {
          $match: {
            memberId: { $in: memberObjIds },
            isDelete: 0
          }
        },

        // Join member (for createdAt)
        {
          $lookup: {
            from: "members",
            localField: "memberId",
            foreignField: "_id",
            as: "member"
          }
        },
        { $unwind: "$member" },

        // Join payments (purpose + startDate)
        {
          $lookup: {
            from: "payments",
            localField: "meetingId",
            foreignField: "_id",
            as: "payment"
          }
        },
        { $unwind: "$payment" },

        {
          $addFields: {
            purpose: { $toLower: "$payment.purpose" },
            meetingDate: { $toDate: "$payment.startDate" },
            joinedDate: { $toDate: "$member.createdAt" }
          }
        },

        // Apply meeting filter
        {
          $match: {
            $expr: {
              $or: [
                { $ne: ["$purpose", "meeting"] }, // event/training always allowed
                {
                  $and: [
                    { $eq: ["$purpose", "meeting"] },
                    { $gt: ["$meetingDate", "$joinedDate"] }
                  ]
                }
              ]
            }
          }
        },

        // group PALMS + meetingCount
        {
          $group: {
            _id: { memberId: "$memberId", purpose: "$purpose" },
            present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
            late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
            managed: { $sum: { $cond: [{ $eq: ["$status", "medical"] }, 1, 0] } },
            substitute: { $sum: { $cond: [{ $eq: ["$status", "substitute"] }, 1, 0] } },
            meetingCount: {
              $sum: { $cond: [{ $eq: ["$purpose", "meeting"] }, 1, 0] }
            }
          }
        }
      ]);

      /* --------------------------------------------------
         3️⃣ Prepare final result
      -------------------------------------------------- */
      const result: any = {};
      members.forEach(id => {
        result[id] = {
          meeting: { present: 0, absent: 0, late: 0, managed: 0, substitute: 0, totalMeetings: 0 },
          event: { present: 0, absent: 0, late: 0, managed: 0, substitute: 0 },
          training: { present: 0, absent: 0, late: 0, managed: 0, substitute: 0 }
        };
      });

      attendance.forEach(row => {
        const memberId = row._id.memberId.toString();
        const purpose = row._id.purpose;

        if (!result[memberId]) return;

        result[memberId][purpose] = {
          ...result[memberId][purpose],
          present: row.present,
          absent: row.absent,
          late: row.late,
          managed: row.managed,
          substitute: row.substitute
        };

        // Set total meetings (meetingCount)
        if (purpose === "meeting") {
          result[memberId].meeting.totalMeetings = row.meetingCount;
        }
      });

      /* --------------------------------------------------
         4️⃣ RESPONSE
      -------------------------------------------------- */
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error("Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch attendance counts"
      });
    }
  }


  @Post("/one-to-one-count")
  async getOneToOneCountForMembers(
    @Req() req: Request,
    @Body() body: { memberIds: string[] | string },
    @Res() res: Response
  ) {
    let { memberIds } = body;

    // --- NEW: handle "fromUser" ---
    if (memberIds === "fromUser") {
      const currentUserId = (req as any).user?.id;
      if (!currentUserId) {
        return res.status(400).json({
          success: false,
          message: "Current user ID not found in token",
        });
      }
      memberIds = [currentUserId]; // <-- normalize to array
    }

    // --- IF SINGLE STRING, CONVERT TO ARRAY ---
    if (typeof memberIds === "string") {
      memberIds = [memberIds];
    }

    // --- VALIDATION ---
    if (!memberIds || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "memberIds are required",
      });
    }

    try {
      const objIds = memberIds.map(id => new mongoose.Types.ObjectId(id));

      // Aggregate only 'from' counts
      const fromCounts = await OneToOne.aggregate([
        { $match: { isDelete: 0, fromMember: { $in: objIds } } },
        { $group: { _id: "$fromMember", count: { $sum: 1 } } }
      ]);

      // Convert to map for easy lookup
      const countsMap: Record<string, { fromCount: number }> = {};
      memberIds.forEach(id => {
        countsMap[id] = { fromCount: 0 };
      });

      fromCounts.forEach((c: any) => {
        countsMap[c._id.toString()].fromCount = c.count;
      });

      return res.status(200).json({ success: true, data: countsMap });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Failed to fetch one-to-one counts" });
    }
  }

  @Post("/referral-count")
  async getReferralCountsByMembers(
    @Req() req: Request,
    @Body() body: { memberIds: string[] | string },
    @Res() res: Response
  ) {
    let { memberIds } = body;
    // --- NEW: handle "fromUser" ---
    if (memberIds === "fromUser") {
      const currentUserId = (req as any).user?.id;
      if (!currentUserId) {
        return res.status(400).json({
          success: false,
          message: "Current user ID not found in token",
        });
      }
      memberIds = [currentUserId]; // <-- normalize to array
    }

    // --- IF SINGLE STRING, CONVERT TO ARRAY ---
    if (typeof memberIds === "string") {
      memberIds = [memberIds];
    }

    if (!memberIds || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "memberIds are required",
      });
    }


    try {
      const objIds = memberIds.map(id => new mongoose.Types.ObjectId(id));

      // Aggregate counts for given members
      const counts = await ReferralSlipModel.aggregate([
        {
          $match: {
            isDelete: 0,
            $or: [
              { fromMember: { $in: objIds } },
              { toMember: { $in: objIds } }
            ]
          }
        },
        {
          $group: {
            _id: null,
            givenArr: { $push: "$fromMember" },
            receivedArr: { $push: "$toMember" }
          }
        }
      ]);

      // Initialize map with zero counts
      const referralMap: Record<string, { given: number; received: number }> = {};
      memberIds.forEach(id => {
        referralMap[id] = { given: 0, received: 0 };
      });

      if (counts.length > 0) {
        const givenArr: string[] = counts[0].givenArr.map((id: any) => id.toString());
        const receivedArr: string[] = counts[0].receivedArr.map((id: any) => id.toString());

        givenArr.forEach(id => {
          if (referralMap[id]) referralMap[id].given += 1;
        });

        receivedArr.forEach(id => {
          if (referralMap[id]) referralMap[id].received += 1;
        });
      }

      return res.status(200).json({
        success: true,
        data: referralMap
      });

    } catch (error) {
      console.error("Error fetching referral counts:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch referral counts" });
    }
  }

  @Post('/thank-you-slip-amounts')
  async getThankYouSlipAmounts(
    @Req() req: Request,
    @Body() body: { memberIds: string[] | string },
    @Res() res: Response
  ) {
    let { memberIds } = body;
    // --- NEW: handle "fromUser" ---
    if (memberIds === "fromUser") {
      const currentUserId = (req as any).user?.id;
      if (!currentUserId) {
        return res.status(400).json({
          success: false,
          message: "Current user ID not found in token",
        });
      }
      memberIds = [currentUserId]; // <-- normalize to array
    }

    // --- IF SINGLE STRING, CONVERT TO ARRAY ---
    if (typeof memberIds === "string") {
      memberIds = [memberIds];
    }

    if (!memberIds || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "memberIds are required",
      });
    }


    try {
      const objIds = memberIds.map(id => new mongoose.Types.ObjectId(id));

      // Aggregate amounts for given members
      const amounts = await ThankYouSlip.aggregate([
        {
          $match: {
            isDelete: 0,
            $or: [
              { fromMember: { $in: objIds } },
              { toMember: { $in: objIds } }
            ]
          }
        },
        {
          $group: {
            _id: null,
            givenArr: { $push: "$fromMember" },
            givenAmounts: { $push: "$amount" },          // sum of given amounts
            receivedArr: { $push: "$toMember" },
            receivedAmounts: { $push: "$amount" }        // sum of received amounts
          }
        }
      ]);

      // Initialize map with zero amounts
      const thankYouMap: Record<string, { givenAmount: number; receivedAmount: number }> = {};
      memberIds.forEach(id => {
        thankYouMap[id] = { givenAmount: 0, receivedAmount: 0 };
      });

      if (amounts.length > 0) {
        const { givenArr, givenAmounts, receivedArr, receivedAmounts } = amounts[0];

        givenArr.forEach((id: any, idx: number) => {
          const key = id.toString();
          if (thankYouMap[key]) thankYouMap[key].givenAmount += givenAmounts[idx] || 0;
        });

        receivedArr.forEach((id: any, idx: number) => {
          const key = id.toString();
          if (thankYouMap[key]) thankYouMap[key].receivedAmount += receivedAmounts[idx] || 0;
        });
      }

      return res.status(200).json({
        success: true,
        data: thankYouMap
      });

    } catch (error) {
      console.error("Error fetching ThankYouSlip amounts:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch ThankYouSlip amounts" });
    }
  }

  @Post("/visitor-count")
  async getVisitorCountsForMembers(
    @Req() req: Request,
    @Body() body: { memberIds: string[] | string },
    @Res() res: Response
  ) {
    let { memberIds } = body;
    // --- NEW: handle "fromUser" ---
    if (memberIds === "fromUser") {
      const currentUserId = (req as any).user?.id;
      if (!currentUserId) {
        return res.status(400).json({
          success: false,
          message: "Current user ID not found in token",
        });
      }
      memberIds = [currentUserId]; // <-- normalize to array
    }

    // --- IF SINGLE STRING, CONVERT TO ARRAY ---
    if (typeof memberIds === "string") {
      memberIds = [memberIds];
    }
    if (!memberIds || memberIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "memberIds are required",
      });
    }


    try {
      const objIds = memberIds.map(id => new mongoose.Types.ObjectId(id));

      const counts = await Visitor.aggregate([
        { $match: { invitedBy: { $in: objIds }, isDelete: 0, isActive: 1 } },
        { $group: { _id: "$invitedBy", count: { $sum: 1 } } }
      ]);

      const visitorMap: Record<string, number> = {};
      memberIds.forEach(id => {
        visitorMap[id] = 0; // default to 0
      });

      counts.forEach(c => {
        visitorMap[c._id.toString()] = c.count;
      });

      return res.status(200).json({ success: true, data: visitorMap });
    } catch (error) {
      console.error("Error fetching visitor counts:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch visitor counts" });
    }
  }

  @Post("/testimonial-counts")
  async getTestimonialCounts(
    @Req() req: Request,
    @Body() body: { memberIds: string[] | string },
    @Res() res: Response
  ) {
    try {
      let { memberIds } = body;

      // --- NEW: handle "fromUser" ---
      if (memberIds === "fromUser") {
        const currentUserId = (req as any).user?.id;
        if (!currentUserId) {
          return res.status(400).json({
            success: false,
            message: "Current user ID not found in token",
          });
        }
        memberIds = [currentUserId]; // <-- normalize to array
      }

      // --- IF SINGLE STRING, CONVERT TO ARRAY ---
      if (typeof memberIds === "string") {
        memberIds = [memberIds];
      }

      // --- VALIDATION ---
      if (!memberIds || memberIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "memberIds are required",
        });
      }

      const objIds = memberIds.map((id) => new mongoose.Types.ObjectId(id));

      const result = await TestimonialSlip.aggregate([
        {
          $match: {
            isDelete: 0,
            isActive: 1,
            $or: [
              { fromMember: { $in: objIds } },
              { toMember: { $in: objIds } },
            ],
          },
        },
        {
          $facet: {
            given: [
              { $match: { fromMember: { $in: objIds } } },
              { $group: { _id: "$fromMember", count: { $sum: 1 } } },
            ],
            received: [
              { $match: { toMember: { $in: objIds } } },
              { $group: { _id: "$toMember", count: { $sum: 1 } } },
            ],
          },
        },
      ]);

      const countsMap: Record<
        string,
        { given: number; received: number }
      > = {};

      memberIds.forEach((id) => {
        countsMap[id] = { given: 0, received: 0 };
      });

      const { given, received } = result[0];

      given.forEach((g: any) => {
        countsMap[g._id.toString()].given = g.count;
      });

      received.forEach((r: any) => {
        countsMap[r._id.toString()].received = r.count;
      });

      return res.status(200).json({ success: true, data: countsMap });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch testimonial counts",
      });
    }
  }
}
