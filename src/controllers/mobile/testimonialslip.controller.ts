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
import { CreateTestimonialSlipDto } from "../../dto/create-testimonialslip.dto";
import { Uploads } from "../../utils/uploads/imageUpload";
import {
  ITestimonialSlip,
  TestimonialSlip,
} from "../../models/testimonialslip.model";
import { Notification } from "../../models/notification.model";
import { ListTestimonialSlipDto } from "../../dto/list-testimonialslip.dto";
import { Member } from "../../models/member.model";
import NotificationController from "./notification.controller";

@JsonController("/api/mobile/testimonialslips")
@UseBefore(AuthMiddleware)
export default class TestimonialSlipController {
  @Post("/")
  async createTestimonialSlip(
    @Body({ validate: false }) createDto: CreateTestimonialSlipDto,
    @Res() res: Response,
    @Req() req: Request
  ) {
    try {
      const toMember = await Member.findById(createDto.toMember);
      if (!toMember) {
        throw new BadRequestError(
          "The specified recipient member does not exist."
        );
      }

      // Handle image uploads if files are present
      let imagesMeta = [];
      if (req.files && req.files.images) {
        // Handle both single and multiple file uploads
        const files = Array.isArray(req.files.images)
          ? req.files.images
          : [req.files.images];
        imagesMeta = await Uploads.processFiles(
          files,
          "testimonialslips",
          "img",
          undefined,
          ""
        );
      }
      createDto.images = imagesMeta;
      const testimonial = new TestimonialSlip({
        ...createDto,
        fromMember: (req as any).user.id,
        createdBy: (req as any).user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const savedTestimonialSlip = await testimonial.save();

      // Create notification
      const fromMemberId = (req as any).user.id;
      if (createDto.toMember.toString() !== fromMemberId.toString()) {
        await NotificationController.createNotification(
          "testimonial",
          createDto.toMember,
          fromMemberId,
          savedTestimonialSlip._id,
          "testimonialslips"
        );
      }

      return res.status(201).json({
        success: true,
        message: "Testimonial Slip created successfully",
        data: savedTestimonialSlip,
      });
    } catch (error) {
      if (error instanceof BadRequestError) throw error;
      throw new InternalServerError("Failed to create Testimonial Slip record");
    }
  }

  @Get("/received/list")
  async listReceivedTestimonialSlips(
    @QueryParams() queryParams: ListTestimonialSlipDto,
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

    const query: FilterQuery<ITestimonialSlip> = {
      isDelete: 0,
      toMember: (req as any).user.id,
    };

    if (search) {
      query.slipNumber = { $regex: search, $options: "i" };
    }

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
        TestimonialSlip.find(query)
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
        TestimonialSlip.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        data: records,
        message: "Testimonial Slip received records fetched successfully",
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      throw new InternalServerError("Failed to fetch Testimonial Slip records");
    }
  }

  @Get("/given/list")
  async listGivenTestimonialSlips(
    @QueryParams() queryParams: ListTestimonialSlipDto,
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

    const query: FilterQuery<ITestimonialSlip> = {
      isDelete: 0,
      fromMember: (req as any).user.id,
    };

    if (search) {
      query.slipNumber = { $regex: search, $options: "i" };
    }

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
        TestimonialSlip.find(query)
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
        TestimonialSlip.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        data: records,
        message: "Testimonial Slip given records fetched successfully",
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      throw new InternalServerError("Failed to fetch Testimonial Slip records");
    }
  }

  @Get("/given/list/:userId")
  async listGivenTestimonialSlipsOthers(
    @Param("userId") userId: string,
    @QueryParams() queryParams: ListTestimonialSlipDto,
    @Res() res: Response,
  ) {
    const { search, sortField = "createdAt", sortOrder = "desc" } = queryParams;
    const page = queryParams.page ?? 1;
    const limit = queryParams.limit ?? 100;
    const skip = (page - 1) * limit;

    const query: FilterQuery<ITestimonialSlip> = {
      isDelete: 0,
      fromMember: userId,
    };

    if (search) {
      query.comments = { $regex: search, $options: "i" };
    }

    try {
      const [records, total] = await Promise.all([
        TestimonialSlip.find(query)
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
        TestimonialSlip.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        data: records,
        message: "Testimonial Slip given records fetched successfully",
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      throw new InternalServerError("Failed to fetch Testimonial Slip records");
    }
  }

  @Get("/received/list/:userId")
  async listReceivedTestimonialSlipsOthers(
    @Param("userId") userId: string,
    @QueryParams() queryParams: ListTestimonialSlipDto,
    @Res() res: Response,
  ) {
    const { search, sortField = "createdAt", sortOrder = "desc" } = queryParams;
    const page = queryParams.page ?? 1;
    const limit = queryParams.limit ?? 100;
    const skip = (page - 1) * limit;

    const query: FilterQuery<ITestimonialSlip> = {
      isDelete: 0,
      toMember: userId,
    };

    if (search) {
      query.comments = { $regex: search, $options: "i" };
    }

    try {
      const [records, total] = await Promise.all([
        TestimonialSlip.find(query)
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
        TestimonialSlip.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        data: records,
        message: "Testimonial Slip received records fetched successfully",
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      throw new InternalServerError("Failed to fetch Testimonial Slip records");
    }
  }

  @Get("/:id")
  async getTestimonialSlipById(@Param("id") id: string, @Res() res: Response) {
    const record = await TestimonialSlip.findOne({ _id: id, isDelete: 0 })
      .populate(
        "toMember",
        "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
      )
      .populate(
        "fromMember",
        "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
      );

    if (!record) {
      throw new NotFoundError("Testimonial Slip record not found");
    }

    return res.status(200).json({
      success: true,
      message: "Testimonial Slip record fetched successfully",
      data: record,
    });
  }

  @Put("/:id")
  async updateTestimonialSlip(
    @Param("id") id: string,
    @Body() body: Partial<CreateTestimonialSlipDto>,
    @Res() res: Response,
    @Req() req: Request
  ) {
    const record = await TestimonialSlip.findOne({ _id: id, isDelete: 0 });

    if (!record) {
      throw new NotFoundError("Testimonial Slip record not found");
    }

    Object.assign(record, body);
    record.updatedAt = new Date();
    record.updatedBy = (req as any).user.id;

    try {
      const updatedRecord = await record.save();
      return res.status(200).json({
        success: true,
        message: "Testimonial Slip updated successfully",
        data: updatedRecord,
      });
    } catch (error) {
      throw new InternalServerError("Failed to update Testimonial Slip record");
    }
  }

  @Delete("/:id")
  async deleteTestimonialSlip(
    @Param("id") id: string,
    @Res() res: Response,
    @Req() req: Request
  ) {
    const record = await TestimonialSlip.findOne({ _id: id, isDelete: 0 });

    if (!record) {
      throw new NotFoundError("Testimonial Slip record not found");
    }

    record.isDelete = 1;
    record.deletedAt = new Date();
    record.updatedBy = (req as any).user.id;

    try {
      await record.save();
      return res.status(200).json({
        success: true,
        message: "Testimonial Slip record deleted successfully",
      });
    } catch (error) {
      throw new InternalServerError("Failed to delete Testimonial Slip record");
    }
  }
}
