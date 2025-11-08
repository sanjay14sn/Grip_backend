// import { JsonController, Post, Get, Body, Param, QueryParams, Res, Put, Delete } from 'routing-controllers';
// import { Response } from 'express';
// import { CreateCountryDto } from '../../dto/create-country.dto';
// import { ListCountryDto } from '../../dto/list-country.dto';
// import { Country, ICountry } from '../../models/country.model';
// import { FilterQuery } from 'mongoose';

// @JsonController('/api/admin/countries')
// export default class CountryController {
//     @Post('/')
//     async createCountry(
//         @Body({ validate: true }) countryData: CreateCountryDto,
//         @Res() res: Response
//     ) {
//         try {
//             // Check if country with same name exists
//             const existingCountry = await Country.findOne({
//                 countryName: { $regex: new RegExp(`^${countryData.countryName}$`, 'i') },
//                 isDelete: 0
//             });

//             if (existingCountry) {
//                 return res.status(400).json({
//                     success: false,
//                     message: 'Country with this name already exists'
//                 });
//             }

//             const country = new Country(countryData);
//             country.createdAt = new Date();
//             country.updatedAt = new Date();

//             const savedCountry = await country.save();
//             return res.status(201).json({
//                 success: true,
//                 message: 'Country created successfully',
//                 data: savedCountry
//             });
//         } catch (error: unknown) {
//             return res.status(500).json({
//                 success: false,
//                 message: error instanceof Error ? error.message : 'An unknown error occurred'
//             });
//         }
//     }

//     @Get('/list')
//     async listCountries(
//         @QueryParams() queryParams: ListCountryDto,
//         @Res() res: Response
//     ) {
//         try {
//             const filter: FilterQuery<ICountry> = { isDelete: 0 };

//             if (queryParams.search) {
//                 filter.$or = [
//                     { countryName: { $regex: queryParams.search, $options: 'i' } }
//                 ];
//             }

//             const sort: { [key: string]: 1 | -1 } = {};
//             if (queryParams.sortField) {
//                 sort[queryParams.sortField] = queryParams.sortOrder === 'asc' ? 1 : -1;
//             }

//             const page = queryParams.page || 1;
//             const limit = queryParams.limit || 10;
//             const skip = (page - 1) * limit;

//             const [countries, total] = await Promise.all([
//                 Country.find(filter)
//                     .sort(sort)
//                     .skip(skip)
//                     .limit(queryParams.limit),
//                 Country.countDocuments(filter)
//             ]);

//             return res.status(200).json({
//                 success: true,
//                 message: 'Countries fetched successfully',
//                 data: countries,
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
//     async getCountry(
//         @Param('id') id: string,
//         @Res() res: Response
//     ) {
//         try {
//             const country = await Country.findOne({ _id: id, isDelete: 0 });

//             if (!country) {
//                 return res.status(404).json({
//                     success: false,
//                     message: 'Country not found'
//                 });
//             }

//             return res.status(200).json({
//                 success: true,
//                 message: 'Country fetched successfully',
//                 data: country
//             });
//         } catch (error: unknown) {
//             return res.status(500).json({
//                 success: false,
//                 message: error instanceof Error ? error.message : 'An unknown error occurred'
//             });
//         }
//     }

//     @Put('/:id')
//     async updateCountry(
//         @Param('id') id: string,
//         @Body({ validate: true }) countryData: CreateCountryDto,
//         @Res() res: Response
//     ) {
//         try {
//             const country = await Country.findOne({ _id: id, isDelete: 0 });
//             if (!country) {
//                 return res.status(404).json({
//                     success: false,
//                     message: 'Country not found'
//                 });
//             }

//             // Only check for unique country name if it's different from current
//             if (countryData.countryName?.toLowerCase() !== country.countryName.toLowerCase()) {
//                 const existingCountry = await Country.findOne({
//                     _id: { $ne: id },
//                     countryName: { $regex: new RegExp(`^${countryData.countryName}$`, 'i') },
//                     isDelete: 0
//                 });

//                 if (existingCountry) {
//                     return res.status(400).json({
//                         success: false,
//                         message: 'Country with this name already exists'
//                     });
//                 }
//             }

//             Object.assign(country, countryData);
//             country.updatedAt = new Date();

//             const updatedCountry = await country.save();
//             return res.status(200).json({
//                 success: true,
//                 message: 'Country updated successfully',
//                 data: updatedCountry
//             });
//         } catch (error: unknown) {
//             return res.status(500).json({
//                 success: false,
//                 message: error instanceof Error ? error.message : 'An unknown error occurred'
//             });
//         }
//     }

//     @Delete('/:id')
//     async deleteCountry(
//         @Param('id') id: string,
//         @Res() res: Response
//     ) {
//         try {
//             const country = await Country.findOne({ _id: id, isDelete: 0 });
//             if (!country) {
//                 return res.status(404).json({
//                     success: false,
//                     message: 'Country not found'
//                 });
//             }

//             country.isDelete = 1;
//             country.deletedAt = new Date();
//             country.updatedAt = new Date();

//             await country.save();
//             return res.status(200).json({
//                 success: true,
//                 message: 'Country deleted successfully'
//             });
//         } catch (error: unknown) {
//             return res.status(500).json({
//                 success: false,
//                 message: error instanceof Error ? error.message : 'An unknown error occurred'
//             });
//         }
//     }
// }
