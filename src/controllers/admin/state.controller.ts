// import { JsonController, Post, Get, Body, Param, QueryParams, Res, Put, Delete } from 'routing-controllers';
// import { Response } from 'express';
// import { CreateStateDto } from '../../dto/create-state.dto';
// import { ListStateDto } from '../../dto/list-state.dto';
// import { State, IState } from '../../models/state.model';
// import { FilterQuery } from 'mongoose';

// @JsonController('/api/admin/states')
// export default class StateController {
//     @Post('/')
//     async createState(
//         @Body({ validate: true }) stateData: CreateStateDto,
//         @Res() res: Response
//     ) {
//         try {
//             // Check if state with same name exists
//             const existingState = await State.findOne({
//                 stateName: { $regex: new RegExp(`^${stateData.stateName}$`, 'i') },
//                 isDelete: 0
//             });

//             if (existingState) {
//                 return res.status(400).json({
//                     success: false,
//                     message: 'State with this name already exists'
//                 });
//             }

//             const state = new State(stateData);
//             state.createdAt = new Date();

//             const savedState = await state.save();
//             return res.status(201).json({
//                 success: true,
//                 message: 'State created successfully',
//                 data: savedState
//             });
//         } catch (error: unknown) {
//             return res.status(500).json({
//                 success: false,
//                 message: error instanceof Error ? error.message : 'An unknown error occurred'
//             });
//         }
//     }

//     @Get('/by-country/:countryId')
//     async getStatesByCountry(
//         @Param('countryId') countryId: string,
//         @Res() res: Response
//     ) {
//         try {
//             const states = await State.find({
//                 countryId,
//                 isDelete: 0
//             })
//                 .sort({ stateName: 1 });

//             return res.status(200).json({
//                 status: true,
//                 message: 'States fetched successfully',
//                 data: states
//             });
//         } catch (error: unknown) {
//             return res.status(500).json({
//                 status: false,
//                 message: error instanceof Error ? error.message : 'An unknown error occurred'
//             });
//         }
//     }

//     @Get('/list')
//     async listStates(
//         @QueryParams() queryParams: ListStateDto,
//         @Res() res: Response
//     ) {
//         try {
//             const filter: FilterQuery<IState> = { isDelete: 0 };

//             if (queryParams.search) {
//                 filter.$or = [
//                     { stateName: { $regex: queryParams.search, $options: 'i' } }
//                 ];
//             }

//             if (queryParams.countryId) {
//                 filter.countryId = queryParams.countryId;
//             }

//             const sort: { [key: string]: 1 | -1 } = {};
//             if (queryParams.sortField) {
//                 sort[queryParams.sortField] = queryParams.sortOrder === 'asc' ? 1 : -1;
//             }

//             const page = queryParams.page || 1;
//             const limit = queryParams.limit || 10;
//             const skip = (page - 1) * limit;

//             const [states, total] = await Promise.all([
//                 State.find(filter)
//                     .sort(sort)
//                     .skip(skip)
//                     .limit(queryParams.limit)
//                     .populate('countryId', 'countryName'),
//                 State.countDocuments(filter)
//             ]);

//             return res.status(200).json({
//                 success: true,
//                 message: 'States fetched successfully',
//                 data: states,
//                 meta: {
//                     page: queryParams.page,
//                     limit: queryParams.limit,
//                     total
//                 }
//             });
//         } catch (error: unknown) {
//             return res.status(500).json({
//                 success: false,
//                 message: error instanceof Error ? error.message : 'An unknown error occurred'
//             });
//         }
//     }

//     @Get('/:id')
//     async getState(
//         @Param('id') id: string,
//         @Res() res: Response
//     ) {
//         try {
//             const state = await State.findOne({ _id: id, isDelete: 0 })
//                 .populate('countryId', 'countryName');

//             if (!state) {
//                 return res.status(404).json({
//                     success: false,
//                     message: 'State not found'
//                 });
//             }

//             return res.status(200).json({
//                 success: true,
//                 message: 'State fetched successfully',
//                 data: state
//             });
//         } catch (error: unknown) {
//             return res.status(500).json({
//                 success: false,
//                 message: error instanceof Error ? error.message : 'An unknown error occurred'
//             });
//         }
//     }

//     @Put('/:id')
//     async updateState(
//         @Param('id') id: string,
//         @Body({ validate: true }) stateData: CreateStateDto,
//         @Res() res: Response
//     ) {
//         try {
//             const state = await State.findOne({ _id: id, isDelete: 0 });
//             if (!state) {
//                 return res.status(404).json({
//                     success: false,
//                     message: 'State not found'
//                 });
//             }

//             // Only check for unique state name if it's different from current
//             if (stateData.stateName?.toLowerCase() !== state.stateName.toLowerCase()) {
//                 const existingState = await State.findOne({
//                     _id: { $ne: id },
//                     stateName: { $regex: new RegExp(`^${stateData.stateName}$`, 'i') },
//                     isDelete: 0
//                 });

//                 if (existingState) {
//                     return res.status(400).json({
//                         success: false,
//                         message: 'State with this name already exists'
//                     });
//                 }
//             }

//             Object.assign(state, stateData);
//             state.updatedAt = new Date();

//             const updatedState = await state.save();
//             return res.status(200).json({
//                 success: true,
//                 message: 'State updated successfully',
//                 data: updatedState
//             });
//         } catch (error: unknown) {
//             return res.status(500).json({
//                 success: false,
//                 message: error instanceof Error ? error.message : 'An unknown error occurred'
//             });
//         }
//     }

//     @Delete('/:id')
//     async deleteState(
//         @Param('id') id: string,
//         @Res() res: Response
//     ) {
//         try {
//             const state = await State.findOne({ _id: id, isDelete: 0 });
//             if (!state) {
//                 return res.status(404).json({
//                     success: false,
//                     message: 'State not found'
//                 });
//             }

//             state.isDelete = 1;
//             state.deletedAt = new Date();
//             state.updatedAt = new Date();

//             await state.save();
//             return res.status(200).json({
//                 success: true,
//                 message: 'State deleted successfully'
//             });
//         } catch (error: unknown) {
//             return res.status(500).json({
//                 success: false,
//                 message: error instanceof Error ? error.message : 'An unknown error occurred'
//             });
//         }
//     }
// }
