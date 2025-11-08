import { JsonController, Post, Get, Body, Param, QueryParams, Res, Put, Delete } from 'routing-controllers';
import { Response } from 'express';
import { HeadTable, IHeadTable } from '../../models/headtable.model';
import { Country } from '../../models/country.model';
import { State } from '../../models/state.model';
import { Zone } from '../../models/zone.model';
import { Chapter } from '../../models/chapter.model';
import { Member } from '../../models/member.model';
import { ListHeadTableDto } from '../../dto/list-headtable.dto';
import { CreateHeadTableDto } from '../../dto/create-headtable.dto';

@JsonController('/api/admin/headtables')
export default class HeadTableController {
    @Post('/')
    async createHeadTable(
        @Body({ validate: true }) headTableData: CreateHeadTableDto,
        @Res() res: Response
    ) {
        try {
            // Validate references exist
            const [country, state, zone, chapter, panelAssociate] = await Promise.all([
                Country.findById(headTableData.countryId),
                State.findById(headTableData.stateId),
                Zone.findById(headTableData.zoneId),
                Chapter.findById(headTableData.chapterId),
                Member.findById(headTableData.panelAssociateId)
            ]);

            if (!country) {
                return res.status(404).json({
                    success: false,
                    message: 'Country not found'
                });
            }

            if (!state) {
                return res.status(404).json({
                    success: false,
                    message: 'State not found'
                });
            }

            if (!zone) {
                return res.status(404).json({
                    success: false,
                    message: 'Zone not found'
                });
            }

            if (!chapter) {
                return res.status(404).json({
                    success: false,
                    message: 'Chapter not found'
                });
            }

            if (!panelAssociate) {
                return res.status(404).json({
                    success: false,
                    message: 'Panel associate not found'
                });
            }

            const headTable = new HeadTable({
                ...headTableData,
                isActive: headTableData.isActive ?? 0,
                isDelete: 0,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            const savedHeadTable = await headTable.save();

            return res.status(201).json({
                success: true,
                message: 'Head table created successfully',
                data: savedHeadTable
            });
        } catch (error: unknown) {
            console.error('Error creating head table:', error);
            return res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to create head table'
            });
        }
    }

    @Get('/list')
    async listHeadTables(
        @QueryParams() queryParams: ListHeadTableDto,
        @Res() res: Response
    ) {
        try {
            const filter: any = { isDelete: 0 };

            if (queryParams.search) {
                filter.$or = [
                    { 'panelAssociateId.firstName': { $regex: queryParams.search, $options: 'i' } },
                    { 'panelAssociateId.lastName': { $regex: queryParams.search, $options: 'i' } },
                    { 'chapterId.name': { $regex: queryParams.search, $options: 'i' } }
                ];
            }

            if (queryParams.countryId) filter.countryId = queryParams.countryId;
            if (queryParams.stateId) filter.stateId = queryParams.stateId;
            if (queryParams.zoneId) filter.zoneId = queryParams.zoneId;
            if (queryParams.chapterId) filter.chapterId = queryParams.chapterId;
            if (queryParams.panelAssociateId) filter.panelAssociateId = queryParams.panelAssociateId;
            if (queryParams.isActive !== undefined) filter.isActive = queryParams.isActive;

            const sort: { [key: string]: 1 | -1 } = {};
            if (queryParams.sortField) {
                sort[queryParams.sortField] = queryParams.sortOrder === 'asc' ? 1 : -1;
            } else {
                sort['createdAt'] = -1; // Default sort
            }

            const page = queryParams.page || 1;
            const limit = queryParams.limit || 100;
            const skip = (page - 1) * limit;

            const [headTables, total] = await Promise.all([
                HeadTable.find(filter)
                    .populate({
                        path: 'countryId',
                        select: 'name countryName',
                        model: 'Country'
                    })
                    .populate({
                        path: 'stateId',
                        select: 'name stateName',
                        model: 'State'
                    })
                    .populate({
                        path: 'zoneId',
                        select: 'name zoneName',
                        model: 'Zone'
                    })
                    .populate({
                        path: 'chapterId',
                        select: 'name chapterName',
                        model: 'Chapter'
                    })
                    .populate({
                        path: 'panelAssociateId',
                        select: 'firstName lastName email mobileNumber chapterInfo personalDetails businessAddress contactDetails businessDetails termsAndCertifications',
                        model: 'Member',
                        options: { lean: true }
                    })
                    .sort(sort)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                HeadTable.countDocuments(filter)
            ]);

            return res.status(200).json({
                success: true,
                message: 'Head tables fetched successfully',
                data: headTables,
                meta: {
                    page,
                    limit,
                    total
                }
            });
        } catch (error: unknown) {
            console.error('Error listing head tables:', error);
            return res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to fetch head tables'
            });
        }
    }

    @Get('/:id')
    async getHeadTable(
        @Param('id') id: string,
        @Res() res: Response
    ) {
        try {
            const headTable = await HeadTable.findOne({ _id: id, isDelete: 0 })
                .populate('countryId', 'name')
                .populate('stateId', 'name')
                .populate('zoneId', 'name')
                .populate('chapterId', 'name')
                .populate('panelAssociateId', 'firstName lastName');

            if (!headTable) {
                return res.status(404).json({
                    success: false,
                    message: 'Head table not found'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Head table fetched successfully',
                data: headTable
            });
        } catch (error: unknown) {
            console.error('Error fetching head table:', error);
            return res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to fetch head table'
            });
        }
    }

    @Put('/:id')
    async updateHeadTable(
        @Param('id') id: string,
        @Body({ validate: true }) headTableData: Partial<CreateHeadTableDto>,
        @Res() res: Response
    ) {
        try {
            if (headTableData.countryId) {
                const country = await Country.findById(headTableData.countryId);
                if (!country) {
                    return res.status(404).json({
                        success: false,
                        message: 'Country not found'
                    });
                }
            }

            if (headTableData.stateId) {
                const state = await State.findById(headTableData.stateId);
                if (!state) {
                    return res.status(404).json({
                        success: false,
                        message: 'State not found'
                    });
                }
            }

            if (headTableData.zoneId) {
                const zone = await Zone.findById(headTableData.zoneId);
                if (!zone) {
                    return res.status(404).json({
                        success: false,
                        message: 'Zone not found'
                    });
                }
            }

            if (headTableData.chapterId) {
                const chapter = await Chapter.findById(headTableData.chapterId);
                if (!chapter) {
                    return res.status(404).json({
                        success: false,
                        message: 'Chapter not found'
                    });
                }
            }

            if (headTableData.panelAssociateId) {
                const panelAssociate = await Member.findById(headTableData.panelAssociateId);
                if (!panelAssociate) {
                    return res.status(404).json({
                        success: false,
                        message: 'Panel associate not found'
                    });
                }
            }

            const updatedHeadTable = await HeadTable.findByIdAndUpdate(
                id,
                {
                    ...headTableData,
                    updatedAt: new Date()
                },
                { new: true }
            )
                .populate('countryId', 'name')
                .populate('stateId', 'name')
                .populate('zoneId', 'name')
                .populate('chapterId', 'name')
                .populate('panelAssociateId', 'firstName lastName');

            if (!updatedHeadTable) {
                return res.status(404).json({
                    success: false,
                    message: 'Head table not found'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Head table updated successfully',
                data: updatedHeadTable
            });
        } catch (error: unknown) {
            console.error('Error updating head table:', error);
            if ((error as any).code === 11000) {
                return res.status(400).json({
                    success: false,
                    message: 'Head table with these details already exists'
                });
            }
            return res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to update head table'
            });
        }
    }

    @Delete('/:id')
    async deleteHeadTable(
        @Param('id') id: string,
        @Res() res: Response
    ) {
        try {
            const headTable = await HeadTable.findByIdAndUpdate(
                id,
                {
                    isDelete: 1,
                    deletedAt: new Date()
                },
                { new: true }
            );

            if (!headTable) {
                return res.status(404).json({
                    success: false,
                    message: 'Head table not found'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Head table deleted successfully'
            });
        } catch (error: unknown) {
            console.error('Error deleting head table:', error);
            return res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : 'Failed to delete head table'
            });
        }
    }
}
