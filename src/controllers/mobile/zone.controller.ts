import {
    JsonController,
    Get,
    Res,
    NotFoundError,
    Param,
    InternalServerError,
    QueryParams,
} from "routing-controllers";
import { Response } from "express";
import { IZone, Zone } from "../../models/zone.model";
import { FilterQuery } from "mongoose";
import { ListZoneDto } from "../../dto/list-zone.dto";

@JsonController("/api/mobile/zones")
export default class ZoneController {
    @Get("/list")
    async getAllZones(
        @QueryParams() queryParams: ListZoneDto,
        @Res() res: Response
    ) {
        try {
            const filter: FilterQuery<IZone> = { isDelete: 0 };

            if (queryParams.search) {
                filter.$or = [
                    { zoneName: { $regex: queryParams.search, $options: "i" } },
                ];
            }

            if (queryParams.countryName) {
                filter.countryName = { $regex: queryParams.countryName, $options: "i" };
            }

            if (queryParams.stateName) {
                filter.stateName = { $regex: queryParams.stateName, $options: "i" };
            }

            const sort: { [key: string]: 1 | -1 } = {};
            if (queryParams.sortField) {
                sort[queryParams.sortField] = queryParams.sortOrder === "asc" ? 1 : -1;
            }

            const page = queryParams.page || 1;
            const limit = queryParams.limit || 100;
            const skip = (page - 1) * limit;

            // Ensure limit is a number
            const safeLimit = typeof limit === "number" ? limit : 10;

            const [zones, total] = await Promise.all([
                Zone.find(filter)
                    .sort(sort)
                    .skip(skip)
                    .limit(safeLimit),
                Zone.countDocuments(filter),
            ]);

            return res.status(200).json({
                success: true,
                message: "Zones fetched successfully",
                data: zones,
                meta: {
                    page: queryParams.page,
                    limit: queryParams.limit,
                    total,
                },
            });
        } catch (error: unknown) {
            return res.status(500).json({
                success: false,
                message:
                    error instanceof Error ? error.message : "An unknown error occurred",
            });
        }
    }
    @Get("/by-state/:stateName")
    async getZonesByState(
        @Param("stateName") stateName: string,
        @Res() res: Response
    ) {
        try {
            const zones = (await Zone.find({
                stateName: { $regex: new RegExp(`^${stateName}$`, "i") },
                isDelete: 0,
            })
                .sort({ zoneName: 1 }))

            const formattedZones = zones.map((zone) => {
                const zoneObj = zone.toObject();
                return zoneObj
            });

            return res.status(200).json({
                status: true,
                message: "Zones fetched successfully",
                data: formattedZones,
            });
        } catch (error: unknown) {
            return res.status(500).json({
                status: false,
                message:
                    error instanceof Error ? error.message : "An unknown error occurred",
            });
        }
    }
    @Get("/:id")
    async getZoneById(@Param("id") id: string, @Res() res: Response) {
        try {
            const zone = await Zone.findById(id).populate("chapter");
            if (!zone) {
                throw new NotFoundError("Zone not found");
            }
            return res.json({ zone });
        } catch (error) {
            console.error("Error fetching zone:", error);
            throw new InternalServerError("Failed to fetch zone");
        }
    }
}
