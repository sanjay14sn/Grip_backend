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
  async createTopAchiver(
    @Param("chapterId") chapterId: string,
    @Body() data: TopAchiverDto,
    @Res() res: Response
  ) {
    try {
      const saved = await TopAchiver.create({
        chapterId,
        ...data,
      });

      return res.status(201).json({
        success: true,
        message: "Top achievers saved successfully",
        data: saved,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to save top achievers",
      });
    }
  }

  @Get("/:chapterId")
  async getTopAchiver(
    @Param("chapterId") chapterId: string,
    @Res() res: Response
  ) {
    try {
      const record = await TopAchiver.findOne({ chapterId });

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
