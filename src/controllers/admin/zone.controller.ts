import { JsonController, Post, Get, Body, Param, QueryParams, Res, Put, Delete } from 'routing-controllers';
import { Response } from 'express';
import { Zone, IZone } from '../../models/zone.model';
import { FilterQuery } from 'mongoose';
import { ListZoneDto } from '../../dto/list-zone.dto';
import { CreateZoneDto } from '../../dto/create-zone.dto';

@JsonController('/api/admin/zones')
export default class ZoneController {
    @Post('/')
    async createZone(
        @Body({ validate: true }) zoneData: CreateZoneDto,
        @Res() res: Response,

    ) {
        try {
            // Check if zone with same name already exists
            const existingZone = await Zone.findOne({
                zoneName: { $regex: new RegExp(`^${zoneData.zoneName}$`, 'i') },
                isDelete: 0
            });

            if (existingZone) {
                return res.status(400).json({
                    success: false,
                    message: 'Zone with this name already exists'
                });
            }

            const zone = new Zone({
                ...zoneData,
                countryName: zoneData.countryName.trim(),
                stateName: zoneData.stateName.trim()
            });
            zone.createdAt = new Date();
            zone.updatedAt = new Date();

            const savedZone = await zone.save();
            return res.status(201).json({
                success: true,
                message: 'Zone created successfully',
                data: savedZone
            });
        } catch (error: unknown) {
            return res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'An unknown error occurred'
            });
        }
    }

    @Get('/list')
    async listZones(
        @QueryParams() queryParams: ListZoneDto,
        @Res() res: Response
    ) {
        try {
            const filter: FilterQuery<IZone> = { isDelete: 0 };

            if (queryParams.search) {
                filter.$or = [
                    { zoneName: { $regex: queryParams.search, $options: 'i' } }
                ];
            }

            if (queryParams.countryName) {
                filter.countryName = { $regex: queryParams.countryName, $options: 'i' };
            }

            if (queryParams.stateName) {
                filter.stateName = { $regex: queryParams.stateName, $options: 'i' };
            }

            const sort: { [key: string]: 1 | -1 } = {};
            if (queryParams.sortField) {
                sort[queryParams.sortField] = queryParams.sortOrder === 'asc' ? 1 : -1;
            }

            const page = queryParams.page || 1;
            const limit = queryParams.limit || 100;
            const skip = (page - 1) * limit;

            // Ensure limit is a number
            const safeLimit = typeof limit === 'number' ? limit : 10;

            const [zones, total] = await Promise.all([
                Zone.find(filter)
                    .sort(sort)
                    .skip(skip)
                    .limit(safeLimit),
                Zone.countDocuments(filter)
            ]);

            return res.status(200).json({
                success: true,
                message: 'Zones fetched successfully',
                data: zones,
                meta: {
                    page: queryParams.page,
                    limit: queryParams.limit,
                    total
                }
            });
        } catch (error: unknown) {
            return res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'An unknown error occurred'
            });
        }
    }

    @Put('/:id')
    async updateZone(
        @Param('id') id: string,
        @Body({ validate: true }) zoneData: CreateZoneDto,
        @Res() res: Response
    ) {
        try {
            const zone = await Zone.findById(id);
            if (!zone) {
                return res.status(404).json({
                    success: false,
                    message: 'Zone not found'
                });
            }

            // Trim country and state names if provided
            if (zoneData.countryName) {
                zoneData.countryName = zoneData.countryName.trim();
            }
            if (zoneData.stateName) {
                zoneData.stateName = zoneData.stateName.trim();
            }

            if (zoneData.zoneName) {
                const existingZone = await Zone.findOne({
                    _id: { $ne: id },
                    zoneName: { $regex: new RegExp(`^${zoneData.zoneName}$`, 'i') },
                    isDelete: 0
                });

                if (existingZone) {
                    return res.status(400).json({
                        success: false,
                        message: 'Zone with this name already exists'
                    });
                }
            }

            const updatedZone = await Zone.findByIdAndUpdate(
                id,
                {
                    ...zoneData,
                    updatedAt: new Date()
                },
                { new: true }
            );

            return res.status(200).json({
                success: true,
                data: updatedZone
            });
        } catch (error: unknown) {
            return res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'An unknown error occurred'
            });
        }
    }

    @Get('/by-state/:stateName')
    async getZonesByState(
        @Param('stateName') stateName: string,
        @Res() res: Response
    ) {
        try {
            const zones = await Zone.find({
                stateName: { $regex: new RegExp(`^${stateName}$`, 'i') },
                isDelete: 0
            }).sort({ zoneName: 1 });

            const formattedZones = zones.map(zone => {
                const zoneObj = zone.toObject();
                return zoneObj
            });

            return res.status(200).json({
                status: true,
                message: 'Zones fetched successfully',
                data: formattedZones
            });
        } catch (error: unknown) {
            return res.status(500).json({
                status: false,
                message: error instanceof Error ? error.message : 'An unknown error occurred'
            });
        }
    }

    @Get('/:id')
    async getZoneById(
        @Param('id') id: string,
        @Res() res: Response
    ) {
        try {
            const zone = await Zone.findOne({
                _id: id,
                isDelete: 0
            })
            if (!zone) {
                return res.status(404).json({
                    status: false,
                    message: 'Zone not found'
                });
            }

            return res.status(200).json({
                status: true,
                message: 'Zone fetched successfully',
                data: zone
            });
        } catch (error: unknown) {
            return res.status(500).json({
                status: false,
                message: error instanceof Error ? error.message : 'An unknown error occurred'
            });
        }
    }

    @Delete('/:id')
    async deleteZone(
        @Param('id') id: string,
        @Res() res: Response
    ) {
        try {
            const zone = await Zone.findOne({ _id: id, isDelete: 0 });
            if (!zone) {
                return res.status(404).json({
                    status: false,
                    message: 'Zone not found'
                });
            }

            zone.isDelete = 1;
            zone.deletedAt = new Date();
            zone.updatedAt = new Date();

            await zone.save();
            return res.status(200).json({
                status: true,
                message: 'Zone deleted successfully'
            });
        } catch (error: unknown) {
            return res.status(500).json({
                status: false,
                message: error instanceof Error ? error.message : 'An unknown error occurred'
            });
        }
    }

        @Get("/list/public")
        async getAllZonesPublic(
            @QueryParams() queryParams: ListZoneDto,
            @Res() res: Response
        ) {
            try {
                const filter: FilterQuery<IZone> = { isDelete: 0 };
    
                if (queryParams.search) {
                    filter.$or = [{ zoneName: { $regex: queryParams.search, $options: "i" } }];
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
                const safeLimit = typeof limit === "number" ? limit : 10;
    
                const [zones, total] = await Promise.all([
                    Zone.find(filter).sort(sort).skip(skip).limit(safeLimit),
                    Zone.countDocuments(filter),
                ]);
    
                return res.status(200).json({
                    success: true,
                    message: "Zones fetched successfully (public)",
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
                    message: error instanceof Error ? error.message : "An unknown error occurred",
                });
            }
        }
}
