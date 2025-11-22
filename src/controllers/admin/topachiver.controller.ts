import {
  JsonController,
  UseBefore,
  Post,
  Get,
  Body,
  Res,
  Param,
} from "routing-controllers";
import { Response } from "express";
import { TopAchiverDto } from "../../dto/top-achiver.dto";
import { TopAchiver } from "../../models/topAchiver.model";
import { AuthMiddleware } from "../../middleware/AuthorizationMiddleware";

@JsonController("/api/admin/topachivers")
@UseBefore(AuthMiddleware)
export default class TopAchiverController {
  @Post("/:chapterId")
  async createOrUpdateTopAchiver(
    @Param("chapterId") chapterId: string,
    @Body() data: TopAchiverDto,
    @Res() res: Response
  ) {
    try {
      const updated = await TopAchiver.findOneAndUpdate(
        { chapterId }, // Find record for this chapter
        {
          $set: {
            chapterId,
            business: data.business,
            referrals: data.referrals,
            visitors: data.visitors,
          },
        },
        {
          new: true, // Return updated record
          upsert: true, // Create if doesn't exist
          setDefaultsOnInsert: true, // Apply schema defaults if new
        }
      );

      return res.status(200).json({
        success: true,
        message: "Top achievers updated successfully",
        data: updated,
      });
    } catch (error) {
      console.error("Top achiever update failed:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update top achievers",
      });
    }
  }

  @Get("/:chapterId")
  async getTopAchiver(
    @Param("chapterId") chapterId: string,
    @Res() res: Response
  ) {
    try {
      const record = await TopAchiver.findOne({ chapterId }).sort({
        updatedAt: -1,
      });

      return res.status(200).json({
        success: true,
        message: "Top achiever fetched",
        data: record || null,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch top achiever",
      });
    }
  }
}
