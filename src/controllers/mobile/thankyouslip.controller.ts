import {
  JsonController,
  Post,
  Get,
  Delete,
  Body,
  Param,
  QueryParams,
  Res,
  NotFoundError,
  InternalServerError,
  UseBefore,
  Req,
  Put,
  BadRequestError,
} from "routing-controllers";
import { Request, Response } from "express";
import { FilterQuery } from "mongoose";
import { AuthMiddleware } from "../../middleware/AuthorizationMiddleware";
import { CreateThankYouSlipDto } from "../../dto/create-thankyouslip.dto";
import ThankYouSlip, { IThankYouSlip } from "../../models/thankyouslip.model";
import { Member } from "../../models/member.model";
import { ReferralStatusLog } from "../../models/referral-status-log.model";
import NotificationController from "./notification.controller";
import { ListThankYouSlipDto } from "../../dto/list-thankyouslip.dto";
import nodemailer from "nodemailer";


@JsonController("/api/mobile/thankyouslips")
@UseBefore(AuthMiddleware)
export default class ThankYouSlipController {
  //   @Post("/")
  //   async createThankYouSlip(
  //     @Body({ validate: true }) createDto: CreateThankYouSlipDto,
  //     @Res() res: Response,
  //     @Req() req: Request
  //   ) {
  //     try {
  //       const fromMemberId = (req as any).user.id;

  //       // --------------------------------------------------
  //       // 1️⃣ Validate Members
  //       // --------------------------------------------------
  //       const toMember = await Member.findById(createDto.toMember);
  //       const fromMember = await Member.findById(fromMemberId);

  //       if (!toMember) {
  //         throw new BadRequestError(
  //           "The specified recipient member does not exist."
  //         );
  //       }

  //       if (!fromMember) {
  //         throw new BadRequestError("Logged-in user not found.");
  //       }
  //       const thankYouSlip = new ThankYouSlip({
  //         ...createDto,
  //         fromMember: fromMemberId,
  //         createdBy: fromMemberId,
  //         createdAt: new Date(),
  //         updatedAt: new Date(),
  //       });

  //       const savedThankYouSlip = await thankYouSlip.save();
  //       await ReferralStatusLog.findOneAndUpdate(
  //         { referralId: createDto.referralId }, // match referralId
  //         {
  //           status: createDto.referralStatus, // Only update status
  //           updatedAt: new Date(),
  //         },
  //         { new: true, upsert: true } // create if not exists
  //       );

  //       // --------------------------------------------------
  //       // 4️⃣ SEND MAIL IF BUSINESS CLOSED
  //       // --------------------------------------------------
  //       if (createDto.referralStatus === "Business Closed") {
  //         const transporter = nodemailer.createTransport({
  //           service: "gmail",
  //           auth: {
  //             user: "gripbusinessforum@gmail.com",
  //             pass: process.env.MAIL_PASSWORD,
  //           },
  //         });

  //         const mailMessage = `
  // Hello ${toMember.personalDetails.firstName},

  // A business you referred has been closed successfully.

  // Referral Name : ${createDto.referralName}
  // Amount        : ${createDto.amount}
  // Comments      : ${createDto.comments}
  // Status        : Business Closed

  // Regards,
  // Grip Forum
  // `;

  //         await transporter.sendMail({
  //           from: `"Grip Forum" <gripbusinessforum@gmail.com>`,
  //           to: toMember.contactDetails.email, // ✔ correct receiver
  //           subject: "Business Closed Update",
  //           text: mailMessage,
  //         });
  //       }
  //       if (createDto.toMember.toString() !== fromMemberId.toString()) {
  //         await NotificationController.createNotification(
  //           "thankyou",
  //           createDto.toMember,
  //           fromMemberId,
  //           savedThankYouSlip._id,
  //           "thankyouslips"
  //         );
  //       }

  //       return res.status(201).json({
  //         success: true,
  //         message: "Thank You Slip created successfully",
  //         data: savedThankYouSlip,
  //       });
  //     } catch (error) {
  //       console.error("THANK YOU SLIP ERROR:", error);

  //       if (error instanceof BadRequestError) throw error;

  //       throw new InternalServerError("Failed to create Thank You Slip record");
  //     }
  //   }
  @Post("/")
  async createThankYouSlip(
    @Body({ validate: true }) createDto: CreateThankYouSlipDto,
    @Res() res: Response,
    @Req() req: Request
  ) {
    try {
      const fromMemberId = (req as any).user.id;

      // --------------------------------------------------
      // 1️⃣ VALIDATE MEMBERS
      // --------------------------------------------------
      const toMember = await Member.findById(createDto.toMember);
      const fromMember = await Member.findById(fromMemberId);

      if (!toMember) {
        throw new BadRequestError(
          "The specified recipient member does not exist."
        );
      }
      if (!fromMember) {
        throw new BadRequestError("Logged-in user not found.");
      }

      // --------------------------------------------------
      // 2️⃣ CREATE THANK YOU SLIP
      // --------------------------------------------------
      const thankYouSlip = new ThankYouSlip({
        ...createDto,
        fromMember: fromMemberId,
        createdBy: fromMemberId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const savedThankYouSlip = await thankYouSlip.save();

      // --------------------------------------------------
      // 3️⃣ UPDATE THE CORRECT REFERRAL STATUS RECORD
      // --------------------------------------------------
      // UNIQUE KEY → referralId + toMember + fromMember + status
      const updatedLog = await ReferralStatusLog.findOneAndUpdate(
        {
          referralId: createDto.referralId,
          toMember: createDto.toMember,
          fromMember: fromMemberId,
          status: createDto.referralStatus, // ← UNIQUE MATCH!
        },
        {
          status: createDto.referralStatus,
          updatedAt: new Date(),
        },
        { new: true }
      );

      // If no log found → create new one
      if (!updatedLog) {
        await ReferralStatusLog.create({
          referralId: createDto.referralId,
          toMember: createDto.toMember,
          fromMember: fromMemberId,
          referralDetail: createDto.referralDetail,
          status: createDto.referralStatus,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // --------------------------------------------------
      // 4️⃣ SEND MAIL IF BUSINESS CLOSED
      // --------------------------------------------------
      if (createDto.referralStatus === "Business Closed") {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: "gripbusinessforum@gmail.com",
            pass: process.env.MAIL_PASSWORD,
          },
        });

        const mailMessage = `
Hello ${toMember.personalDetails.firstName},

A business you referred has been closed successfully.

Referral Name : ${createDto.referralName}
Amount        : ${createDto.amount}
Comments      : ${createDto.comments}
Status        : Business Closed

Regards,
Grip Forum
`;

        await transporter.sendMail({
          from: `"Grip Forum" <gripbusinessforum@gmail.com>`,
          to: toMember.contactDetails.email,
          subject: "Business Closed Update",
          text: mailMessage,
        });
      }

      // --------------------------------------------------
      // 5️⃣ CREATE NOTIFICATION
      // --------------------------------------------------
      if (createDto.toMember.toString() !== fromMemberId.toString()) {
        await NotificationController.createNotification(
          "thankyou",
          createDto.toMember,
          fromMemberId,
          savedThankYouSlip._id,
          "thankyouslips"
        );
      }

      return res.status(201).json({
        success: true,
        message: "Thank You Slip created successfully",
        data: savedThankYouSlip,
      });
    } catch (error) {
      console.error("THANK YOU SLIP ERROR:", error);
      if (error instanceof BadRequestError) throw error;
      throw new InternalServerError("Failed to create Thank You Slip record");
    }
  }

  @Get("/received/list")
  async listReceivedThankYouSlips(
    @QueryParams() queryParams: ListThankYouSlipDto,
    @Res() res: Response,
    @Req() req: Request
  ) {
    const {
      search,
      sortField = "createdAt",
      sortOrder = "desc",
      fromDate,
      toDate,
    } = queryParams;
    const page = queryParams.page ?? 1;
    const limit = queryParams.limit ?? 100;
    const skip = (page - 1) * limit;

    const query: FilterQuery<IThankYouSlip> = {
      isDelete: 0,
      toMember: (req as any).user.id,
    };

    if (search) {
      query.comments = { $regex: search, $options: "i" };
    }

    if (fromDate && toDate) {
      query.createdAt = {
        $gte: new Date(fromDate),
        $lte: new Date(toDate),
      };
    }

    try {
      const [records, total] = await Promise.all([
        ThankYouSlip.find(query)
          .populate(
            "toMember",
            "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
          )
          .populate(
            "fromMember",
            "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
          )
          .sort({ [sortField]: sortOrder === "asc" ? 1 : -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ThankYouSlip.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        data: records,
        message: "Thank You Slip received records fetched successfully",
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      throw new InternalServerError("Failed to fetch Thank You Slip records");
    }
  }

  @Get("/given/list")
  async listGivenThankYouSlips(
    @QueryParams() queryParams: ListThankYouSlipDto,
    @Res() res: Response,
    @Req() req: Request
  ) {
    const {
      search,
      sortField = "createdAt",
      sortOrder = "desc",
      fromDate,
      toDate,
    } = queryParams;
    const page = queryParams.page ?? 1;
    const limit = queryParams.limit ?? 100;
    const skip = (page - 1) * limit;

    const query: FilterQuery<IThankYouSlip> = {
      isDelete: 0,
      fromMember: (req as any).user.id,
    };

    if (search) {
      query.comments = { $regex: search, $options: "i" };
    }

    // if (fromDate && toDate) {
    //   query.createdAt = {
    //     $gte: new Date(fromDate),
    //     $lte: new Date(toDate),
    //   };
    // }
    if (fromDate && toDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);

      query.createdAt = {
        $gte: start,
        $lte: end,
      };
    }


    try {
      const [records, total] = await Promise.all([
        ThankYouSlip.find(query)
          .populate(
            "toMember",
            "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
          )
          .populate(
            "fromMember",
            "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
          )
          .sort({ [sortField]: sortOrder === "asc" ? 1 : -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ThankYouSlip.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        data: records,
        message: "Thank You Slip given records fetched successfully",
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      throw new InternalServerError("Failed to fetch Thank You Slip records");
    }
  }

  @Get("/given/list/:userId")
  async listGivenThankYouSlipsById(
    @Param("userId") userId: string,
    @QueryParams() queryParams: ListThankYouSlipDto,
    @Res() res: Response
  ) {
    const { search, sortField = "createdAt", sortOrder = "desc" } = queryParams;
    const page = queryParams.page ?? 1;
    const limit = queryParams.limit ?? 100;
    const skip = (page - 1) * limit;

    const query: FilterQuery<IThankYouSlip> = {
      isDelete: 0,
      fromMember: userId,
    };

    if (search) {
      query.comments = { $regex: search, $options: "i" };
    }

    try {
      const [records, total] = await Promise.all([
        ThankYouSlip.find(query)
          .populate(
            "toMember",
            "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
          )
          .populate(
            "fromMember",
            "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
          )
          .sort({ [sortField]: sortOrder === "asc" ? 1 : -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ThankYouSlip.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        data: records,
        message: "Thank You Slip given records fetched successfully",
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      throw new InternalServerError("Failed to fetch Thank You Slip records");
    }
  }

  @Get("/received/list/:userId")
  async listReceivedThankYouSlipsById(
    @Param("userId") userId: string,
    @QueryParams() queryParams: ListThankYouSlipDto,
    @Res() res: Response,
    @Req() req: Request
  ) {
    const { search, sortField = "createdAt", sortOrder = "desc" } = queryParams;
    const page = queryParams.page || 1;
    const limit = queryParams.limit || 100;
    const skip = (page - 1) * limit;

    const query: FilterQuery<IThankYouSlip> = {
      isDelete: 0,
      toMember: userId,
    };

    if (search) {
      query.comments = { $regex: search, $options: "i" };
    }

    try {
      const [records, total] = await Promise.all([
        ThankYouSlip.find(query)
          .populate(
            "toMember",
            "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
          )
          .populate(
            "fromMember",
            "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
          )
          .sort({ [sortField]: sortOrder === "asc" ? 1 : -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ThankYouSlip.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        data: records,
        message: "Thank You Slip received records fetched successfully",
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      throw new InternalServerError("Failed to fetch Thank You Slip records");
    }
  }

  @Get("/:id")
  async getThankYouSlipById(@Param("id") id: string, @Res() res: Response) {
    const record = await ThankYouSlip.findOne({ _id: id, isDelete: 0 })
      .populate(
        "toMember",
        "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
      )
      .populate(
        "fromMember",
        "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
      );

    if (!record) {
      throw new NotFoundError("Thank You Slip record not found");
    }

    return res.status(200).json({
      success: true,
      message: "Thank You Slip record fetched successfully",
      data: record,
    });
  }

  @Put("/:id")
  async updateThankYouSlip(
    @Param("id") id: string,
    @Body() body: Partial<CreateThankYouSlipDto>,
    @Res() res: Response,
    @Req() req: Request
  ) {
    const record = await ThankYouSlip.findOne({ _id: id, isDelete: 0 });

    if (!record) {
      throw new NotFoundError("Thank You Slip record not found");
    }

    Object.assign(record, body);
    record.updatedAt = new Date();
    record.updatedBy = (req as any).user.id;

    try {
      const updatedRecord = await record.save();
      return res.status(200).json({
        success: true,
        message: "Thank You Slip updated successfully",
        data: updatedRecord,
      });
    } catch (error) {
      throw new InternalServerError("Failed to update Thank You Slip record");
    }
  }

  @Delete("/:id")
  async deleteThankYouSlip(
    @Param("id") id: string,
    @Res() res: Response,
    @Req() req: Request
  ) {
    const record = await ThankYouSlip.findOne({ _id: id, isDelete: 0 });

    if (!record) {
      throw new NotFoundError("Thank You Slip record not found");
    }

    record.isDelete = 1;
    record.deletedAt = new Date();
    record.updatedBy = (req as any).user.id;

    try {
      await record.save();
      return res.status(200).json({
        success: true,
        message: "Thank You Slip record deleted successfully",
      });
    } catch (error) {
      throw new InternalServerError("Failed to delete Thank You Slip record");
    }
  }
}
