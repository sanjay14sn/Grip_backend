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
import { OneToOne, IOneToOne } from "../../models/onetoone.model";
import { Uploads } from "../../utils/uploads/imageUpload";
import { CreateOneToOneDto } from "../../dto/create-onetoone.dto";
import { ListOneToOneDto } from "../../dto/list-onetoone.dto";
import { AuthMiddleware } from "../../middleware/AuthorizationMiddleware";
import { FilterQuery } from "mongoose";
import { SocketService } from "../../services/socket.service";
import NotificationController from "./notification.controller";

@JsonController("/api/mobile/onetoone")
@UseBefore(AuthMiddleware)
export default class OneToOneController {
  @Post("/")
  async createOneToOne(
    @Body({ validate: true }) createDto: CreateOneToOneDto,
    @Res() res: Response,
    @Req() req: Request
  ) {
    try {
      let imagesMeta = [];
      if (req.files && req.files.images) {
        const files = Array.isArray(req.files.images)
          ? req.files.images
          : [req.files.images];
        imagesMeta = await Uploads.processFiles(
          files,
          "onetoone",
          "img",
          undefined,
          ""
        );
      }
      createDto.images = imagesMeta;
      const oneToOne = new OneToOne({
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
        fromMember: (req as any).user.id,
        createdBy: (req as any).user.id,
      });
      const savedOneToOne = await oneToOne.save();

      // Create notification
      const fromMemberId = (req as any).user.id;
      if (createDto.toMember.toString() !== fromMemberId.toString()) {
        await NotificationController.createNotification(
          "onetoone",
          createDto.toMember,
          fromMemberId,
          savedOneToOne._id,
          "OneToOne"
        );
      }



      return res.status(201).json({
        success: true,
        message: "OneToOne created successfully",
        data: savedOneToOne,
      });
    } catch (error) {
      throw new InternalServerError("Failed to create OneToOne record");
    }
  }

  @Get("/list")
  async listOneToOnes(
    @QueryParams() queryParams: ListOneToOneDto,
    @Res() res: Response,
    @Req() req: Request
  ) {
    const {
      page = queryParams.page ?? 1,
      limit = queryParams.limit ?? 100,
      search,
      sortField = "createdAt",
      sortOrder = "desc",
      fromDate,
      toDate,
    } = queryParams;
    const skip = (page - 1) * limit;
    const currentUserId = (req as any).user.id;

    const query: FilterQuery<IOneToOne> = {
      isDelete: 0,
      $or: [{ fromMember: currentUserId }, { toMember: currentUserId }],
    };

    if (search) {
      // Add search logic if needed, for example, searching by address
      query.address = { $regex: search, $options: "i" };
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
        OneToOne.find(query)
          .populate(
            "fromMember",
            "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
          )
          .populate(
            "toMember",
            "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
          )
          .sort({ [sortField]: sortOrder === "asc" ? 1 : -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        OneToOne.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        message: "OneToOne records fetched successfully",
        data: records,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      throw new InternalServerError("Failed to fetch OneToOne records");
    }
  }

  @Get("/list/:userId")
  async listOneToOnesById(
    @Param("userId") userId: string,
    @QueryParams() queryParams: ListOneToOneDto,
    @Res() res: Response,
  ) {
    const {
      page = queryParams.page ?? 1,
      limit = queryParams.limit ?? 100,
      search,
      sortField = "createdAt",
      sortOrder = "desc",
    } = queryParams;
    const skip = (page - 1) * limit;

    const query: FilterQuery<IOneToOne> = {
      isDelete: 0,
      $or: [{ fromMember: userId }, { toMember: userId }],
    };

    if (search) {
      query.address = { $regex: search, $options: "i" };
    }

    try {
      const [records, total] = await Promise.all([
        OneToOne.find(query)
          .populate(
            "fromMember",
            "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
          )
          .populate(
            "toMember",
            "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
          )
          .sort({ [sortField]: sortOrder === "asc" ? 1 : -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        OneToOne.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        message: "OneToOne given records fetched successfully",
        data: records,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      throw new InternalServerError("Failed to fetch OneToOne records");
    }
  }
  @Get("/:id")
  async getOneToOneById(@Param("id") id: string, @Res() res: Response) {
    const record = await OneToOne.findOne({ _id: id, isDelete: 0 })
      .populate(
        "fromMember",
        "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
      )
      .populate(
        "toMember",
        "personalDetails.firstName personalDetails.lastName personalDetails.profileImage personalDetails.companyName"
      );

    if (!record) {
      throw new NotFoundError("OneToOne record not found");
    }

    return res.status(200).json({
      success: true,
      message: "OneToOne record fetched successfully",
      data: record,
    });
  }

  @Put("/:id")
  async updateOneToOne(
    @Param("id") id: string,
    @Body() body: Partial<CreateOneToOneDto>,
    @Res() res: Response,
    @Req() req: Request
  ) {
    const record = await OneToOne.findOne({ _id: id, isDelete: 0 });

    if (!record) {
      throw new NotFoundError("OneToOne record not found");
    }

    Object.assign(record, body);
    record.updatedAt = new Date();
    record.updatedBy = (req as any).user.id;

    try {
      const updatedRecord = await record.save();
      return res.status(200).json({
        success: true,
        message: "OneToOne updated successfully",
        data: updatedRecord,
      });
    } catch (error) {
      throw new InternalServerError("Failed to update OneToOne record");
    }
  }

  @Delete("/:id")
  async deleteOneToOne(
    @Param("id") id: string,
    @Res() res: Response,
    @Req() req: Request
  ) {
    const record = await OneToOne.findById(id);

    if (!record) {
      throw new NotFoundError("OneToOne record not found");
    }

    record.isDelete = 1;
    record.deletedAt = new Date();
    record.deletedBy = (req as any).user.id;

    try {
      await record.save();
      return res.status(200).json({
        success: true,
        message: "OneToOne record deleted successfully",
      });
    } catch (error) {
      throw new InternalServerError("Failed to delete OneToOne record");
    }
  }
}
