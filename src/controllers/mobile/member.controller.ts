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
  BodyParam,
} from "routing-controllers";
import { Response, Request } from "express";
import {
  CreateMemberDto,
  UpdateMemberDto,
} from "../../dto/create-member.dto";
import { Uploads } from "../../utils/uploads/imageUpload";
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
@UseBefore(AuthMiddleware)
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
          return res
            .status(400)
            .json({ success: false, message: "Invalid chapter ID format" });
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
  @UseBefore(AuthMiddleware)
  async updateProfileMember(
    @Param("id") id: string,
    // payload as JSON string
    @BodyParam("payload") payloadString: string,
    @Body({ validate: { whitelist: true, forbidNonWhitelisted: false } })
    memberData: UpdateProfileMemberDto,

    @Res() res: Response,
    @Req() req: Request
  ) {
    try {
      const existingMember = await Member.findById(id);
      if (!existingMember) {
        throw new NotFoundError("Member not found");
      }

      // If payload exists, override memberData completely
      if (payloadString) {
        const parsed = JSON.parse(payloadString);

        // Manually assign parsed payload to validated memberData object
        Object.assign(memberData, parsed);
      }

      /** ------------------------------------------------------
       *  Handle Profile Image Upload
       * ------------------------------------------------------ */
      let imageMeta = null;

      if (req.files && req.files.profileImage) {
        const file = Array.isArray(req.files.profileImage)
          ? req.files.profileImage[0]
          : req.files.profileImage;

        imageMeta = (
          await Uploads.processFiles([file], "members", "img", undefined, "")
        )[0];
      }

      // Save uploaded image
      if (imageMeta) {
        existingMember.personalDetails.profileImage = imageMeta;
      }

      /** ------------------------------------------------------
       *  Update personalDetails
       * ------------------------------------------------------ */
      if (memberData.personalDetails) {
        const { firstName, lastName, dob } = memberData.personalDetails;
        if (firstName) existingMember.personalDetails.firstName = firstName;
        if (lastName) existingMember.personalDetails.lastName = lastName;
        if (dob) existingMember.personalDetails.dob = new Date(dob);
      }

      /** ------------------------------------------------------
       *  Update contactDetails
       * ------------------------------------------------------ */
      if (memberData.contactDetails) {
        const { secondaryPhone, website } = memberData.contactDetails;

        if (secondaryPhone)
          existingMember.contactDetails.secondaryPhone = secondaryPhone;
        if (website) existingMember.contactDetails.website = website;
      }

      /** ------------------------------------------------------
       *  Update businessAddress
       * ------------------------------------------------------ */
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

      /** ------------------------------------------------------
       *  Update businessDetails
       * ------------------------------------------------------ */
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
        data: updatedMember,
      });
    } catch (error) {
      console.error("Error updating member:", error);

      throw new InternalServerError(
        error instanceof Error ? error.message : "Unknown error"
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

  @Get("/meetings-attendance-count/:userId")
  async getMembersAttendanceCount(
    @Param("userId") userId: string,
    @Res() res: Response
  ) {
    try {
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "userId is required in URL",
        });
      }

      const memberObjId = new mongoose.Types.ObjectId(userId);

      /* --------------------------------------------------
         Aggregation logic
      -------------------------------------------------- */
      const attendance = await Attendance.aggregate([
        {
          $match: {
            memberId: memberObjId,
            isDelete: 0,
          },
        },
        {
          $lookup: {
            from: "members",
            localField: "memberId",
            foreignField: "_id",
            as: "member",
          },
        },
        { $unwind: "$member" },
        {
          $lookup: {
            from: "payments",
            localField: "meetingId",
            foreignField: "_id",
            as: "payment",
          },
        },
        { $unwind: "$payment" },
        {
          $addFields: {
            purpose: { $toLower: "$payment.purpose" },
            meetingDate: { $toDate: "$payment.startDate" },
            joinedDate: { $toDate: "$member.createdAt" },
          },
        },
        {
          $match: {
            $expr: {
              $or: [
                { $ne: ["$purpose", "meeting"] },
                {
                  $and: [
                    { $eq: ["$purpose", "meeting"] },
                    { $gt: ["$meetingDate", "$joinedDate"] },
                  ],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: "$purpose",
            present: {
              $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
            },
            absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
            late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
            managed: {
              $sum: { $cond: [{ $eq: ["$status", "medical"] }, 1, 0] },
            },
            substitute: {
              $sum: { $cond: [{ $eq: ["$status", "substitute"] }, 1, 0] },
            },
            meetingCount: {
              $sum: { $cond: [{ $eq: ["$purpose", "meeting"] }, 1, 0] },
            },
          },
        },
      ]);

      /* --------------------------------------------------
         Build response
      -------------------------------------------------- */
      const result: any = {
        [userId]: {
          meeting: {
            present: 0,
            absent: 0,
            late: 0,
            managed: 0,
            substitute: 0,
            totalMeetings: 0,
          },
          event: { present: 0, absent: 0, late: 0, managed: 0, substitute: 0 },
          training: {
            present: 0,
            absent: 0,
            late: 0,
            managed: 0,
            substitute: 0,
          },
        },
      };

      attendance.forEach((row) => {
        const purpose = row._id;
        result[userId][purpose] = {
          ...result[userId][purpose],
          present: row.present,
          absent: row.absent,
          late: row.late,
          managed: row.managed,
          substitute: row.substitute,
        };

        if (purpose === "meeting") {
          result[userId].meeting.totalMeetings = row.meetingCount;
        }
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error fetching attendance:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch attendance counts",
      });
    }
  }

  @Get("/one-to-one-count/:userId")
  async getOneToOneCountForMembers(
    @Param("userId") userId: string,
    @Res() res: Response
  ) {
    try {
      if (!userId)
        return res
          .status(400)
          .json({ success: false, message: "userId is required in URL" });

      const objId = new mongoose.Types.ObjectId(userId);

      const fromCounts = await OneToOne.aggregate([
        { $match: { isDelete: 0, fromMember: objId } },
        { $group: { _id: "$fromMember", count: { $sum: 1 } } },
      ]);

      const countsMap: Record<string, { fromCount: number }> = {
        [userId]: { fromCount: 0 },
      };

      if (fromCounts.length) countsMap[userId].fromCount = fromCounts[0].count;

      return res.status(200).json({ success: true, data: countsMap });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch one-to-one counts" });
    }
  }

  @Get("/referral-count/:userId")
  async getReferralCountsByMembers(
    @Param("userId") userId: string,
    @Res() res: Response
  ) {
    try {
      if (!userId)
        return res
          .status(400)
          .json({ success: false, message: "userId is required in URL" });

      const objId = new mongoose.Types.ObjectId(userId);

      const counts = await ReferralSlipModel.aggregate([
        {
          $match: {
            isDelete: 0,
            $or: [{ fromMember: objId }, { toMember: objId }],
          },
        },
        {
          $group: {
            _id: null,
            givenArr: { $push: "$fromMember" },
            receivedArr: { $push: "$toMember" },
          },
        },
      ]);

      const referralMap: Record<string, { given: number; received: number }> = {
        [userId]: { given: 0, received: 0 },
      };

      if (counts.length) {
        const { givenArr, receivedArr } = counts[0];
        referralMap[userId].given = givenArr.filter(
          (id: any) => id.toString() === userId
        ).length;
        referralMap[userId].received = receivedArr.filter(
          (id: any) => id.toString() === userId
        ).length;
      }

      return res.status(200).json({ success: true, data: referralMap });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch referral counts" });
    }
  }

  @Get("/thank-you-slip-amounts/:userId")
  async getThankYouSlipAmounts(
    @Param("userId") userId: string,
    @Res() res: Response
  ) {
    try {
      if (!userId)
        return res
          .status(400)
          .json({ success: false, message: "userId is required in URL" });

      const objId = new mongoose.Types.ObjectId(userId);

      const amounts = await ThankYouSlip.aggregate([
        {
          $match: {
            isDelete: 0,
            $or: [{ fromMember: objId }, { toMember: objId }],
          },
        },
        {
          $group: {
            _id: null,
            givenArr: { $push: "$fromMember" },
            givenAmounts: { $push: "$amount" },
            receivedArr: { $push: "$toMember" },
            receivedAmounts: { $push: "$amount" },
          },
        },
      ]);

      const thankYouMap: any = {
        [userId]: { givenAmount: 0, receivedAmount: 0 },
      };

      if (amounts.length) {
        const { givenArr, givenAmounts, receivedArr, receivedAmounts } =
          amounts[0];
        givenArr.forEach((id: any, idx: number) => {
          if (id.toString() === userId)
            thankYouMap[userId].givenAmount += givenAmounts[idx] || 0;
        });
        receivedArr.forEach((id: any, idx: number) => {
          if (id.toString() === userId)
            thankYouMap[userId].receivedAmount += receivedAmounts[idx] || 0;
        });
      }

      return res.status(200).json({ success: true, data: thankYouMap });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch ThankYouSlip amounts",
      });
    }
  }

  @Get("/visitor-count/:userId")
  async getVisitorCountsForMembers(
    @Param("userId") userId: string,
    @Res() res: Response
  ) {
    try {
      if (!userId)
        return res
          .status(400)
          .json({ success: false, message: "userId is required in URL" });

      const objId = new mongoose.Types.ObjectId(userId);

      const counts = await Visitor.aggregate([
        { $match: { invitedBy: objId, isDelete: 0, isActive: 1 } },
        { $group: { _id: "$invitedBy", count: { $sum: 1 } } },
      ]);

      const visitorMap: Record<string, number> = { [userId]: 0 };
      if (counts.length) visitorMap[userId] = counts[0].count;

      return res.status(200).json({ success: true, data: visitorMap });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch visitor counts" });
    }
  }

  @Get("/testimonial-counts/:userId")
  async getTestimonialCounts(
    @Param("userId") userId: string,
    @Res() res: Response
  ) {
    try {
      if (!userId)
        return res
          .status(400)
          .json({ success: false, message: "userId is required in URL" });

      const objId = new mongoose.Types.ObjectId(userId);

      const result = await TestimonialSlip.aggregate([
        {
          $match: {
            isDelete: 0,
            isActive: 1,
            $or: [{ fromMember: objId }, { toMember: objId }],
          },
        },
        {
          $facet: {
            given: [
              { $match: { fromMember: objId } },
              { $group: { _id: "$fromMember", count: { $sum: 1 } } },
            ],
            received: [
              { $match: { toMember: objId } },
              { $group: { _id: "$toMember", count: { $sum: 1 } } },
            ],
          },
        },
      ]);

      const countsMap: Record<string, { given: number; received: number }> = {
        [userId]: { given: 0, received: 0 },
      };
      if (result.length) {
        const { given, received } = result[0];
        if (given.length) countsMap[userId].given = given[0].count;
        if (received.length) countsMap[userId].received = received[0].count;
      }

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
