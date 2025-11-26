import mongoose from 'mongoose';
import {
  JsonController,
  UseBefore,
  Get,
  Post,
  Body,
  Res,
  Req,
  QueryParam,
  Param,
  QueryParams
} from "routing-controllers";
import { Response, Request } from "express";
import { AuthMiddleware } from "../../middleware/AuthorizationMiddleware";
import { ExpectedVisitor } from "../../models/expectedvisitors.model"; // <-- your model
import { Member } from "../../models/member.model";


@JsonController("/api/mobile/expectedVisitors")
@UseBefore(AuthMiddleware)
export default class ExpectedVisitorsController {
  // -------------------------------------------
  // POST — Create Expected Visitor
  // -------------------------------------------
  @Post("/")
  async create(@Body() body: any, @Res() res: Response) {
    try {
      const {
        name,
        company,
        category,
        mobile,
        email,
        address,
        visitDate,
        invitedBy,
        createdBy,
        chapterId,
        zoneId,
      } = body;

      // Basic validation
      if (
        !name ||
        !company ||
        !category ||
        !mobile ||
        !email ||
        !address ||
        !visitDate ||
        !chapterId
      ) {
        return res.status(400).json({
          success: false,
          message: "All fields are required",
        });
      }

      const newExpectedVisitor = await ExpectedVisitor.create({
        name,
        company,
        category,
        mobile,
        email,
        address,
        visitDate,
        invitedBy,
        createdBy,
        chapterId,
        zoneId,
        isActive: 1,
        isDelete: 0,
        status: "Pending",
      });

      return res.json({
        success: true,
        message: "Expected visitor created successfully",
        data: newExpectedVisitor,
      });
    } catch (error) {
      console.error("Error creating expected visitor:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create expected visitor",
      });
    }
  }
  // -------------------------------------------
  // GET — Fetch Expected Visitors (admin/mobile)
  // -------------------------------------------
  @Get("/")
  async getAll(@Req() req: Request, @Res() res: Response) {
    try {
      const user = (req as any).user; // user decoded from token

      if (!user?.id) {
        return res.status(400).json({
          success: false,
          message: "User ID missing in token",
        });
      }

      // Fetch expected visitors created by this user
      const filter: any = { createdBy: user.id };

      const { fromDate, toDate } = req.query;

      if (fromDate && toDate) {
        filter.visitDate = {
          $gte: new Date(fromDate as string),
          $lte: new Date(toDate as string),
        };
      }

      const visitors = await ExpectedVisitor.find(filter)
        .populate("invitedBy")
        .sort({ createdAt: -1 });

      return res.json({
        success: true,
        data: visitors,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch expected visitors",
      });
    }
  }

  @Get("/list/:userId")
  async listExpectedVisitorsByUserId(
    @Param("userId") userId: string,
    @QueryParams() queryParams: any,
    @Res() res: Response
  ) {
    try {
      const page = Number(queryParams.page) || 1;
      const limit = Number(queryParams.limit) || 100;
      const skip = (page - 1) * limit;

      const {
        search,
        sortField = "createdAt",
        sortOrder = "desc",
      } = queryParams;

      // 🔥 FILTER BY MEMBER (correct)
      const query: any = {
        isDelete: 0,
        invitedBy: new mongoose.Types.ObjectId(userId),
      };

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { category: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      const [records, total] = await Promise.all([
        ExpectedVisitor.aggregate([
          { $match: query },
          { $sort: { [sortField]: sortOrder === "asc" ? 1 : -1 } },
          { $skip: skip },
          { $limit: limit },

          {
            $lookup: {
              from: "members",
              localField: "invitedBy",
              foreignField: "_id",
              as: "invitedBy",
              pipeline: [
                {
                  $project: {
                    "personalDetails.firstName": 1,
                    "personalDetails.lastName": 1,
                    "personalDetails.companyName": 1,
                    "personalDetails.profileImage": 1,
                  },
                },
              ],
            },
          },
          { $unwind: "$invitedBy" },
        ]),
        ExpectedVisitor.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        data: records,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("Expected Visitors Error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch expected visitors",
      });
    }
  }
}
