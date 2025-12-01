import {
    JsonController,
    Get,
    Req,
    Res,
    UseBefore,
    InternalServerError,
} from 'routing-controllers';
import { Request, Response } from 'express';
import { AuthMiddleware } from '../../middleware/AuthorizationMiddleware';
import { TestimonialSlip } from '../../models/testimonialslip.model';
import ThankYouSlip from '../../models/thankyouslip.model';
import { Visitor } from '../../models/visitor.model';
import { OneToOne } from '../../models/onetoone.model';
import { ExpectedVisitor } from '../../models/expectedvisitors.model';
import { ReferralSlipModel } from '../../models/referralslip.model';
import mongoose from 'mongoose';
import { Chapter } from '../../models/chapter.model';

@JsonController('/api/mobile/dashboard')
@UseBefore(AuthMiddleware)
export default class DashboardController {
  @Get("/count-summary")
  async getCountSummary(@Req() req: Request, @Res() res: Response) {
    try {
      const memberId = (req as any).user?.id;
      if (!memberId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: No member info found.",
        });
      }

      console.log(req.query.filterType,"filter");
      

      // WEEKDAY COMES FROM QUERY (monday/tuesday/wednesday...)
      const chapterId = req.query.chapterId as string;

      const chapter = await Chapter.findById(chapterId).lean();

      if (!chapter) {
        return res.status(404).json({ success: false, message: "Invalid chapterId" });
      }

      const weekday = (chapter.weekday || "monday").toLowerCase();
      // Convert weekday → number
      const weekdayMap: Record<string, number> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };
      const meetingDay = weekdayMap[weekday] ?? 1; // default Monday

      // FILTER TYPE
      const filterType = (req.query.filterType as string) || "overall";

      // -----------------------
      // DATE RANGE FUNCTIONS
      // -----------------------
      function getWeekRange(meetingDay: number) {
        const now = new Date();
        const currentDay = now.getDay(); // 0=Sun, 6=Sat

        // Find LAST OCCURRENCE of meetingDay
        let diff = currentDay - meetingDay;
        if (diff < 0) diff += 7; // go backwards up to last meeting day

        // Start = last meeting day (Saturday)
        const start = new Date(now);
        start.setDate(now.getDate() - diff);
        start.setHours(0, 0, 0, 0);

        // End = +6 days (Friday 23:59:59.999)
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        return { start, end };
      }

      // MONTH RANGE: start = first day of month, end = last day of current month
      function getMonthRange(monthsBack: number) {
        const now = new Date();

        // Start = first day of month N months ago at 00:00 UTC
        const start = new Date(Date.UTC(
          now.getFullYear(),
          now.getMonth() - (monthsBack - 1),
          1,
          0, 0, 0, 0
        ));

        // End = last day of current month at 23:59:59.999 UTC
        const end = new Date(Date.UTC(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23, 59, 59, 999
        ));
        console.log(start, end)

        return { start, end };
      }

      // -----------------------
      // APPLY FILTER TYPE
      // -----------------------
      let startDate: Date | null = null;
      let endDate: Date = new Date();

      if (filterType === "this-week") {
        const r = getWeekRange(meetingDay);
        startDate = r.start;
        endDate = r.end;
      } else if (filterType === "this-month") {
        const r = getMonthRange(1);
        startDate = r.start;
        endDate = r.end;
      } else if (filterType === "3-months") {
        const r = getMonthRange(3);
        startDate = r.start;
        endDate = r.end;
      } else if (filterType === "6-months") {
        const r = getMonthRange(6);
        startDate = r.start;
        endDate = r.end;
      } else if (filterType === "12-months") {
        const r = getMonthRange(12);
        startDate = r.start;
        endDate = r.end;
      } else {
        startDate = null; // overall
      }

      // Build Mongo date filter
      const dateFilter = startDate
        ? { createdAt: { $gte: startDate, $lte: endDate } }
        : {};

      // Status logic
      let statusFilter = {};
      if (["this-month", "3-months", "6-months", "12-months"].includes(filterType)) {
        statusFilter = {};
      } else if (filterType === "overall") {
        statusFilter = { status: { $ne: "reject" } };
      }

      const memberObjectId = new mongoose.Types.ObjectId(memberId);

      // --------------------------------
      //          QUERY SECTION
      // --------------------------------
      const [
        testimonialGivenCount,
        referralGivenCount,
        thankYouGivenAmountResult,
        thankYouGivenCount,
        testimonialReceivedCount,
        referralReceivedCount,
        thankYouReceivedAmountResult,
        thankYouReceivedCount,
        visitorCount,
        expectedVisitorCount,
        oneToOneCount,
      ] = await Promise.all([
        TestimonialSlip.countDocuments({
          fromMember: memberObjectId,
          isActive: 1,
          isDelete: 0,
          ...dateFilter,
          ...statusFilter,
        }),
        ReferralSlipModel.countDocuments({
          fromMember: memberObjectId,
          isActive: 1,
          isDelete: 0,
          ...dateFilter,
          ...statusFilter,
        }),
        ThankYouSlip.aggregate([
          {
            $match: {
              fromMember: memberObjectId,
              isActive: 1,
              isDelete: 0,
              ...dateFilter,
              ...statusFilter,
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        ThankYouSlip.countDocuments({
          fromMember: memberObjectId,
          isActive: 1,
          isDelete: 0,
          ...dateFilter,
          ...statusFilter,
        }),
        TestimonialSlip.countDocuments({
          toMember: memberObjectId,
          isActive: 1,
          isDelete: 0,
          ...dateFilter,
          ...statusFilter,
        }),
        ReferralSlipModel.countDocuments({
          toMember: memberObjectId,
          isActive: 1,
          isDelete: 0,
          ...dateFilter,
          ...statusFilter,
        }),
        ThankYouSlip.aggregate([
          {
            $match: {
              toMember: memberObjectId,
              isActive: 1,
              isDelete: 0,
              ...dateFilter,
              ...statusFilter,
            },
          },
          { $group: { _id: null, total: { $sum: "$amount" } } },
        ]),
        ThankYouSlip.countDocuments({
          fromMember: memberObjectId,
          isActive: 1,
          isDelete: 0,
          ...dateFilter,
          ...statusFilter,
        }),
        Visitor.countDocuments({
          invitedBy: memberObjectId,
          isActive: 1,
          isDelete: 0,
          ...dateFilter,
          ...statusFilter,
        }),
        ExpectedVisitor.countDocuments({
          invitedBy: memberObjectId,
          isActive: 1,
          isDelete: 0,
          ...dateFilter,
          ...statusFilter,
        }),
        OneToOne.countDocuments({
          $or: [{ fromMember: memberObjectId }, { toMember: memberObjectId }],
          isActive: 1,
          isDelete: 0,
          ...dateFilter,
          ...statusFilter,
        }),
      ]);

      const thankYouGivenAmount = thankYouGivenAmountResult[0]?.total || 0;
      const thankYouReceivedAmount = thankYouReceivedAmountResult[0]?.total || 0;

      return res.json({
        data: {
          testimonialGivenCount,
          referralGivenCount,
          thankYouGivenAmount,
          thankYouGivenCount,
          testimonialReceivedCount,
          referralReceivedCount,
          thankYouReceivedAmount,
          thankYouReceivedCount,
          visitorCount,
          expectedVisitorCount,
          oneToOneCount,
        },
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      throw new InternalServerError("Failed to fetch dashboard summary");
    }
  }
}