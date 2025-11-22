import { JsonController, UseBefore, Get, Res, Req } from "routing-controllers";
import { Response, Request } from "express";
import { AuthMiddleware } from "../../middleware/AuthorizationMiddleware";
import { ExpectedVisitor } from "../../models/expectedvisitors.model";

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
}
