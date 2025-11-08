import {
  JsonController,
  Get,
  QueryParams,
  Res,
  InternalServerError,
  UseBefore,
  Req,
} from "routing-controllers";
import { FilterQuery } from "mongoose";
import { AuthMiddleware } from "../../middleware/AuthorizationMiddleware";
import Payment, { IPayment } from "../../models/payment.model";
import { ListPaymentDto } from "../../dto/list-payment.dto";
import { Request, Response } from "express";
import { Member } from "../../models/member.model";

@JsonController("/api/mobile/agenta")
@UseBefore(AuthMiddleware)
export default class PaymentController {
  @Get("/list")
  async listPayments(
    @QueryParams() queryParams: ListPaymentDto,
    @Res() res: Response,
    @Req() req: Request
  ) {
    const {
      search,
      sortField = "createdAt",
      sortOrder = "desc",
      purpose,
    } = queryParams;
    const page = queryParams.page ?? 1;
    const limit = queryParams.limit ?? 100;
    const skip = (page - 1) * limit;

    const query: FilterQuery<IPayment> = { 
      isDelete: 0,
      startDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } // Today at 00:00:00
    };

    const user = (req as any).user;
    if (user && user.id) {
      const member = await Member.findById(user.id).lean();
      if (member && member.chapterInfo && member.chapterInfo.chapterId) {
        query.chapterId = member.chapterInfo.chapterId;
      }
    }


    if (search) {
      query.$or = [
        { topic: { $regex: search, $options: "i" } },
        { comments: { $regex: search, $options: "i" } },
      ];
    }

    if (purpose) {
      query.purpose = purpose;
    }

    try {
      const [records, total] = await Promise.all([
        Payment.find(query)
          .populate("chapterId", "chapterName")
          .populate(
            "createdBy",
            "personalDetails.firstName personalDetails.lastName"
          )
          .sort({ [sortField]: sortOrder === "asc" ? 1 : -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Payment.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        data: records,
        message: "Payment records fetched successfully",
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      throw new InternalServerError("Failed to fetch Payment records");
    }
  }
}
