import {
  JsonController,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  QueryParams,
  Res,
  Req,
  UseBefore,
  NotFoundError,
  InternalServerError,
} from "routing-controllers";
import { Request, Response } from "express";
import { FilterQuery } from "mongoose";
import { AuthMiddleware } from "../../middleware/AuthorizationMiddleware";
import { CreateReferralSlipDto } from "../../dto/create-referralslip.dto";
import { ListReferralSlipDto } from "../../dto/list-referralslip.dto";
import { ReferralSlipModel } from "../../models/referralslip.model";
import NotificationController from "./notification.controller";
import { Member } from "../../models/member.model";
import nodemailer from "nodemailer";

@JsonController("/api/mobile/referralslip")
@UseBefore(AuthMiddleware)
export default class ReferralSlipController {
  @Post("/")
  async createReferralSlip(
    @Body({ validate: true }) createDto: CreateReferralSlipDto,
    @Res() res: Response,
    @Req() req: Request
  ) {
    const userId = (req as any).user.id;
    const referralSlip = new ReferralSlipModel({
      ...createDto,
      fromMember: userId,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    try {
      const saved = await referralSlip.save();

      // step -1
      // 2️⃣ Fetch member details for email
      const toMember = await Member.findById(createDto.toMember);
      const fromMember = await Member.findById(userId);

      if (!toMember) {
        return res.status(404).json({
          success: false,
          message: "To Member not found",
        });
      }

      // ---- MEMBER NAME & EMAIL FIX ----
      const toMemberFullName = `${toMember.personalDetails.firstName} ${
        toMember.personalDetails.lastName ?? ""
      }`.trim();
      const toMemberEmail = toMember.contactDetails.email;

      const fromMemberFullName = `${fromMember?.personalDetails.firstName} ${
        fromMember?.personalDetails.lastName ?? ""
      }`.trim();

      // 3️⃣ Prepare email content
      const mailMessage = `
Hello ${toMemberFullName},

You have received a new referral from ${fromMemberFullName}.

Referral Details:
------------------------------------
Name      : ${createDto.referalDetail.name}
Mobile    : ${createDto.referalDetail.mobileNumber}
Address   : ${createDto.referalDetail.address}
Comments  : ${createDto.referalDetail.comments}

Referral Status: ${createDto.referalStatus}

Regards,
GripForum System
`;

      // 4️⃣ Nodemailer Transporter
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "marishalagiri@gmail.com",
          pass: process.env.MAIL_PASSWORD,
        },
      });

      // 5️⃣ Send Email
      await transporter.sendMail({
        from: `"Grip Forum" <marishalagiri@gmail.com>`,
        to: toMemberEmail,
        subject: "You Received a New Referral",
        text: mailMessage,
      });

      // 6️⃣ Create Notification (your existing logic)
      if (createDto.toMember.toString() !== userId.toString()) {
        await NotificationController.createNotification(
          "referral",
          createDto.toMember,
          userId,
          saved._id,
          "referralslips"
        );
      }

      return res.status(201).json({
        success: true,
        message: "ReferralSlip created successfully",
        data: saved,
      });
    } catch (error) {
      console.error("REFERRAL CREATION ERROR:", error);
      return res.status(500).json({
        success: false,
        message: "Email sending error",
        error: error,
      });
    }
  }

  @Get("/received/list")
  async listReceivedReferralSlips(
    @QueryParams() queryParams: ListReferralSlipDto,
    @Res() res: Response,
    @Req() req: Request
  ) {
    const { page = queryParams.page ?? 1, limit = queryParams.limit ?? 100, fromDate, toDate, ...filters } = queryParams;
    const skip = (+page - 1) * +limit;
    const userId = (req as any).user.id;
    const query: FilterQuery<any> = {
      isDelete: 0,
      toMember: userId,
    };
    if (filters.toMember) query.toMember = filters.toMember;
    if (filters.fromMember) query.fromMember = filters.fromMember;
    if (filters.referalStatus) query.referalStatus = filters.referalStatus;
    if (fromDate && toDate) {
      query.createdAt = {
        $gte: fromDate,
        $lte: toDate,
      };
    }
    try {
      const [records, total] = await Promise.all([
        ReferralSlipModel.find(query)
          .populate(
            "fromMember",
            "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
          )
          .populate(
            "toMember",
            "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(+limit)
          .lean(),
        ReferralSlipModel.countDocuments(query),
      ]);
      return res.status(200).json({
        success: true,
        message: "ReferralSlip received records fetched successfully",
        data: records,
        pagination: {
          total,
          page: +page,
          limit: +limit,
          totalPages: Math.ceil(total / +limit),
        },
      });
    } catch (error) {
      throw new InternalServerError(
        "Failed to fetch received ReferralSlip records"
      );
    }
  }
  @Get("/given/list")
  async listGivenReferralSlips(
    @QueryParams() queryParams: ListReferralSlipDto,
    @Res() res: Response,
    @Req() req: Request
  ) {
    const { page = queryParams.page ?? 1, limit = queryParams.limit ?? 100, fromDate, toDate, ...filters } = queryParams;
    const skip = (+page - 1) * +limit;
    const userId = (req as any).user.id;
    const query: FilterQuery<any> = {
      isDelete: 0,
      fromMember: userId,
    };
    if (filters.toMember) query.toMember = filters.toMember;
    if (filters.fromMember) query.fromMember = filters.fromMember;
    if (filters.referalStatus) query.referalStatus = filters.referalStatus;
    if (fromDate && toDate) {
      query.createdAt = {
        $gte: fromDate,
        $lte: toDate,
      };
    }
    try {
      const [records, total] = await Promise.all([
        ReferralSlipModel.find(query)
          .populate(
            "fromMember",
            "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
          )
          .populate(
            "toMember",
            "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(+limit)
          .lean(),
        ReferralSlipModel.countDocuments(query),
      ]);
      return res.status(200).json({
        success: true,
        message: "ReferralSlip given records fetched successfully",
        data: records,
        pagination: {
          total,
          page: +page,
          limit: +limit,
          totalPages: Math.ceil(total / +limit),
        },
      });
    } catch (error) {
      throw new InternalServerError(
        "Failed to fetch given ReferralSlip records"
      );
    }
  }

  @Get("/given/list/:userId")
  async listGivenReferralSlipsById(
    @Param("userId") userId: string,
    @QueryParams() queryParams: ListReferralSlipDto,
    @Res() res: Response,
    @Req() req: Request
  ) {
    const { page = queryParams.page ?? 1, limit = queryParams.limit ?? 100, ...filters } = queryParams;
    const skip = (+page - 1) * +limit;
    const query: FilterQuery<any> = {
      isDelete: 0,
      fromMember: userId,
    };
    if (filters.toMember) query.toMember = filters.toMember;
    if (filters.fromMember) query.fromMember = filters.fromMember;
    if (filters.referalStatus) query.referalStatus = filters.referalStatus;
    try {
      const [records, total] = await Promise.all([
        ReferralSlipModel.find(query)
          .populate(
            "fromMember",
            "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
          )
          .populate(
            "toMember",
            "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(+limit)
          .lean(),
        ReferralSlipModel.countDocuments(query),
      ]);
      return res.status(200).json({
        success: true,
        message: "ReferralSlip given records fetched successfully",
        data: records,
        pagination: {
          total,
          page: +page,
          limit: +limit,
          totalPages: Math.ceil(total / +limit),
        },
      });
    } catch (error) {
      throw new InternalServerError(
        "Failed to fetch given ReferralSlip records"
      );
    }
  }

  @Get("/received/list/:userId")
  async listReceivedReferralSlipsById(
    @Param("userId") userId: string,
    @QueryParams() queryParams: ListReferralSlipDto,
    @Res() res: Response,
    @Req() req: Request
  ) {
    const { page = 1, limit = 10, ...filters } = queryParams;
    const skip = (+page - 1) * +limit;
    const query: FilterQuery<any> = {
      isDelete: 0,
      toMember: userId,
    };
    if (filters.toMember) query.toMember = filters.toMember;
    if (filters.fromMember) query.fromMember = filters.fromMember;
    if (filters.referalStatus) query.referalStatus = filters.referalStatus;
    try {
      const [records, total] = await Promise.all([
        ReferralSlipModel.find(query)
          .populate(
            "fromMember",
            "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
          )
          .populate(
            "toMember",
            "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(+limit)
          .lean(),
        ReferralSlipModel.countDocuments(query),
      ]);
      return res.status(200).json({
        success: true,
        message: "ReferralSlip received records fetched successfully",
        data: records,
        pagination: {
          total,
          page: +page,
          limit: +limit,
          totalPages: Math.ceil(total / +limit),
        },
      });
    } catch (error) {
      throw new InternalServerError(
        "Failed to fetch received ReferralSlip records"
      );
    }
  }

  @Get("/:id")
  async getReferralSlipById(@Param("id") id: string, @Res() res: Response) {
    const record = await ReferralSlipModel.findOne({ _id: id, isDelete: 0 })
      .populate(
        "fromMember",
        "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
      )
      .populate(
        "toMember",
        "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
      );
    if (!record) {
      throw new NotFoundError("ReferralSlip not found");
    }
    return res
      .status(200)
      .json({
        success: true,
        message: "ReferralSlip fetched successfully",
        data: record,
      });
  }

  @Put("/:id")
  async updateReferralSlip(
    @Param("id") id: string,
    @Body() body: Partial<CreateReferralSlipDto>,
    @Res() res: Response,
    @Req() req: Request
  ) {
    const record = await ReferralSlipModel.findOne({ _id: id, isDelete: 0 });
    if (!record) {
      throw new NotFoundError("ReferralSlip not found");
    }
    Object.assign(record, body);
    record.updatedAt = new Date();
    record.updatedBy = (req as any).user.id;
    try {
      const updated = await record.save();
      return res
        .status(200)
        .json({
          success: true,
          message: "ReferralSlip updated successfully",
          data: updated,
        });
    } catch (error) {
      throw new InternalServerError("Failed to update ReferralSlip");
    }
  }

  @Delete("/:id")
  async deleteReferralSlip(
    @Param("id") id: string,
    @Res() res: Response,
    @Req() req: Request
  ) {
    const record = await ReferralSlipModel.findById(id);
    if (!record) {
      throw new NotFoundError("ReferralSlip not found");
    }
    record.isDelete = 1;
    record.deletedAt = new Date();
    record.updatedBy = (req as any).user.id;
    try {
      await record.save();
      return res
        .status(200)
        .json({ success: true, message: "ReferralSlip deleted successfully" });
    } catch (error) {
      throw new InternalServerError("Failed to delete ReferralSlip");
    }
  }
}
