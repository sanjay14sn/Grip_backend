import {    
    JsonController,
    Get,
    Body,
    Param,
    QueryParams,
    Res,
    NotFoundError,
    InternalServerError,
    Req,
    Patch,
    Delete,
    UseBefore, } from "routing-controllers";
import { Response, Request } from "express";
import { FilterQuery } from 'mongoose';
import { AuthMiddleware } from "../../middleware/AuthorizationMiddleware";
import { ExpectedVisitor } from "../../models/expectedvisitors.model";
import { Chapter } from "../../models/chapter.model";
import { Member } from "../../models/member.model";

@JsonController("/api/admin/expectedvisitors")
@UseBefore(AuthMiddleware)
export default class ExpectedVisitorsController {
  @Get("/")
  async getAll(@Req() req: Request, @Res() res: Response) {
    try {
      const { fromDate, toDate } = req.query;

      const filter: any = {};

      // Optional date filter
      if (fromDate && toDate) {
        filter.visitDate = {
          $gte: new Date(fromDate as string),
          $lte: new Date(toDate as string),
        };
      }

      const visitors = await ExpectedVisitor.find(filter)
        .populate({
          path: "invitedBy",
          select: "personalDetails",
        })
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

  @Get("/:id")
  async getByChapter(
    @Param("id") id: string,
    @QueryParams() queryParams: any,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const { page = 1, limit = 10 } = queryParams;
      const skip = (page - 1) * limit;

      // 1️⃣ Validate Chapter
      const chapter = await Chapter.findOne({ _id: id, isDelete: 0 })
        .populate("zoneId", "zoneName")
        .populate("cidId", "name email");

      if (!chapter) {
        return res.status(404).json({
          success: false,
          message: "Chapter not found",
        });
      }

      // 2️⃣ Fetch Members of this chapter
      const members = await Member.find({
        "chapterInfo.chapterId": id,
        isActive: 1,
        isDelete: 0,
      });

      const memberIds = members.map((m) => m._id);

      // 3️⃣ Fetch Expected Visitors invited by These Members
      const query: FilterQuery<any> = {
        isDelete: 0,
        invitedBy: { $in: memberIds },
      };

      const [records, total] = await Promise.all([
        ExpectedVisitor.find(query)
          .populate("invitedBy", "personalDetails contactDetails")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),

        ExpectedVisitor.countDocuments(query),
      ]);

      // 4️⃣ Format Data
      const formattedRecords = records.map((record: any) => ({
        _id: record._id,
        name: record.name,
        company: record.company,
        category: record.category,
        mobile: record.mobile,
        email: record.email,
        address: record.address,
        visitDate: record.visitDate,
        status: record.status,
        invited_by_member: record.invited_by_member,
        createdAt: record.createdAt,

        invite: {
          id: record.invitedBy?._id,
          name: `${record.invitedBy?.personalDetails?.firstName || ""} ${
            record.invitedBy?.personalDetails?.lastName || ""
          }`.trim(),
          mobile: record.invitedBy?.contactDetails?.mobileNumber || "",
          profileImage: record.invitedBy?.personalDetails?.profileImage || null,
        },
      }));

      // 5️⃣ Response
      return res.status(200).json({
        success: true,
        message: "Expected visitors fetched successfully",
        data: {
          chapter: {
            _id: chapter._id,
            chapterName: chapter.chapterName,
            zoneName: (chapter.zoneId as any)?.zoneName,
            cidName: (chapter.cidId as any)?.name,
            memberCount: members.length,
          },
          records: formattedRecords,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Error fetching expected visitors:", error);
      throw new InternalServerError("Failed to fetch expected visitors");
    }
  }

  @Delete("/delete/:id")
  async softDelete(
    @Param("id") id: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const visitor = await ExpectedVisitor.findOne({ _id: id, isDelete: 0 });

      if (!visitor) {
        return res.status(404).json({
          success: false,
          message: "Expected visitor not found",
        });
      }

      await ExpectedVisitor.updateOne(
        { _id: id },
        {
          isDelete: 1,
          deletedAt: new Date(),
        }
      );

      return res.status(200).json({
        success: true,
        message: "Visitor deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting expected visitor:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to delete expected visitor",
      });
    }
  }
}
