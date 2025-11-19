import {
  JsonController,
  UseBefore,
  Get,
  Post,
  Body,
  Res,
  QueryParam,
} from "routing-controllers";
import { Response } from "express";
import { AuthMiddleware } from "../../middleware/AuthorizationMiddleware";
import { ExpectedVisitor } from "../../models/expectedvisitors.model"; // <-- your model

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
  async getAll(
    @Res() res: Response,
    @QueryParam("chapterId") chapterId: string,
    @QueryParam("fromDate") fromDate: string,
    @QueryParam("toDate") toDate: string
  ) {
    try {
      if (!chapterId) {
        return res.status(400).json({
          success: false,
          message: "chapterId is required",
        });
      }

      const filter: any = { chapterId };

      if (fromDate && toDate) {
        filter.visitDate = {
          $gte: new Date(fromDate),
          $lte: new Date(toDate),
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
      console.error("Error fetching expected visitors:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch expected visitors",
      });
    }
  }
}
