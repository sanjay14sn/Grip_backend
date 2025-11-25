import multer from "multer";
import path from "path";
import {
  JsonController,
  Get,
  Post,
  Patch,
  QueryParams,
  Delete,
  Param,
  Body,
  Req,
  Res,
  UseBefore,
} from "routing-controllers";
import { Request, Response } from "express";
import { Pin, IPin } from "../../models/pin.model";
import { CreatePinDto, UpdatePinDto } from "../../dto/create-pin.dto";
import { AuthMiddleware } from "../../middleware/AuthorizationMiddleware";
import { FilterQuery } from "mongoose";
import { Uploads } from "../../utils/uploads/imageUpload";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // controller is inside src/controllers/Admin/
    // so go 2 levels up to reach project root
    cb(null, path.join(__dirname, "../../../public/pins"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, "img-" + Date.now() + ext);
  },
});

const upload = multer({ storage });

declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}



@JsonController("/api/admin/pins")
@UseBefore(AuthMiddleware)
export default class PinController {
  // 🟢 Create Pin
  @Post("/")
  async createPin(
    @Req() req: Request,
    @Res() res: Response,
    @Body({validate: true}) body: CreatePinDto
  ) {
    try {
      const { name } = body;

      if (!name?.trim()) {
        return res
          .status(400)
          .json({ success: false, message: "Name is required" });
      }

  let imageMeta = null;

  if (req.file) {
    imageMeta = {
      docName: req.file.filename,
      docPath: "pins",
      originalName: req.file.originalname,
    };
  }


      const newPin = new Pin({
        name,
        image: imageMeta || null, // store full image metadata if available
        createdBy: (req as any).user?.id,
      });

      const savedPin = await newPin.save();

      return res.status(201).json({
        success: true,
        message: "Pin created successfully",
        data: savedPin,
      });
    } catch (error: unknown) {
      console.error("Error creating pin:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      return res.status(500).json({ success: false, message: errorMessage });
    }
  }

  // 🟡 Get all Pins
  @Get("/list")
  async listPins(@QueryParams() query: any, @Res() res: Response) {
    try {
      const {
        search = "",
        sortField = "createdAt",
        sortOrder = "desc",
        page = 1,
        limit = 10,
      } = query;

      // ✅ Base filter
      const filter: FilterQuery<IPin> = { isDelete: 0 };

      // ✅ Add search condition (case-insensitive)
      if (search) {
        filter.$or = [{ name: { $regex: search, $options: "i" } }];
      }

      // ✅ Sorting
      const sort: Record<string, 1 | -1> = {
        [sortField]: sortOrder === "asc" ? 1 : -1,
      };

      // ✅ Pagination
      const skip = (page - 1) * limit;

      // ✅ Query DB in parallel for better performance
      const [pins, total] = await Promise.all([
        Pin.find(filter).sort(sort).skip(skip).limit(Number(limit)).exec(),
        Pin.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        message: "Pins fetched successfully",
        data: pins,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error("❌ Error fetching pins:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch pins",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // 🔵 Get pin by ID
  @Get("/:id")
  async getPin(@Param("id") id: string, @Res() res: Response) {
    try {
      const pin = await Pin.findOne({ _id: id, isDelete: 0 });
      if (!pin) {
        return res
          .status(404)
          .json({ success: false, message: "Pin not found" });
      }
      return res.status(200).json({ success: true, data: pin });
    } catch (error) {
      console.error("Error fetching pin:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch pin" });
    }
  }

  // 🟠 Update pin
  @Patch("/:id")
  async updatePin(
    @Param("id") id: string,
    @Req() req: Request,
    @Res() res: Response,
    @Body() updateData: UpdatePinDto
  ) {
    try {
      const pin = await Pin.findOne({ _id: id, isDelete: 0 });
      if (!pin) {
        return res
          .status(404)
          .json({ success: false, message: "Pin not found" });
      }

      // ✅ handle updated image (same as create)
      if (req.files && (req.files as any).image) {
        const file = Array.isArray((req.files as any).image)
          ? (req.files as any).image[0]
          : (req.files as any).image;

        const imageMeta = (
          await Uploads.processFiles([file], "pins", "img", undefined, "")
        )[0];

        if (imageMeta) updateData.image = imageMeta;
      }

      Object.assign(pin, updateData, {
        updatedBy: (req as any).user?.id,
        updatedAt: new Date(),
      });

      await pin.save();

      return res.status(200).json({
        success: true,
        message: "Pin updated successfully",
        data: pin,
      });
    } catch (error) {
      console.error("Error updating pin:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to update pin" });
    }
  }

  // 🔴 Delete pin (soft delete)
  @Delete("/:id")
  async deletePin(
    @Param("id") id: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    try {
      const pin = await Pin.findOne({ _id: id, isDelete: 0 });
      if (!pin) {
        return res
          .status(404)
          .json({ success: false, message: "Pin not found" });
      }

      pin.isDelete = 1;
      pin.updatedBy = (req as any).user?.id;
      await pin.save();

      return res
        .status(200)
        .json({ success: true, message: "Pin deleted successfully" });
    } catch (error) {
      console.error("Error deleting pin:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to delete pin" });
    }
  }
}
