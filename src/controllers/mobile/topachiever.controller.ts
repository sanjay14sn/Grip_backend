import { JsonController, Get, Param, Res } from "routing-controllers";
import { Response } from "express";
import { TopAchiver } from "../../models/topAchiver.model";

@JsonController("/api/mobile/topachievers")
export class MobileTopAchieverController {
  @Get("/:chapterId")
  async getMobileTopAchievers(
    @Param("chapterId") chapterId: string,
    @Res() res: Response
  ) {
    try {
      // Prevent caching (important for mobile)
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      // Always fetch the latest achiever for chapter
      const record = await TopAchiver.findOne({ chapterId })
        .sort({ updatedAt: -1 })
        .lean();

      return res.status(200).json({
        success: true,
        message: "Top achiever fetched",
        data: record || null,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch achiever",
      });
    }
  }
}
