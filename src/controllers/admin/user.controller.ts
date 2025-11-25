import {
    JsonController,
    Post,
    Get,
    Body,
    Param,
    QueryParams,
    Res,
    Put,
    Delete,
    UseBefore,
    Req,
    QueryParam,
} from "routing-controllers";
import { Request, Response } from "express";
import { Uploads } from "../../utils/uploads/imageUpload";
import { CreateUserDto } from "../../dto/create-user.dto";
import { UpdateUserDto } from "../../dto/update-user.dto";
import { ListUsersDto } from "../../dto/list-users.dto";
import { User, IUser } from "../../models/user.model";
import { FilterQuery } from "mongoose";
import { AuthMiddleware } from "../../middleware/AuthorizationMiddleware";

@JsonController("/api/admin/users")
export default class UserController {
    @Post("/")
    async createUser(
        @Body({ validate: true }) userData: CreateUserDto,
        @Res() res: Response,
        @Req() req: Request
    ) {
        try {
            const existingUser = await User.findOne({
                $or: [
                    { mobileNumber: userData.mobileNumber },
                    { username: userData.username },
                ],
                isDelete: 0,
            });

            if (existingUser) {
                let conflictField =
                    existingUser.mobileNumber === userData.mobileNumber
                        ? "Mobile number"
                        : "Username";
                return res.status(400).json({
                    success: false,
                    message: `${conflictField} already in use`,
                });
            }

            const user = new User();
            user.name = userData.name;
            user.companyName = userData.companyName;
            user.email = userData.email;
            user.username = userData.username;
            user.mobileNumber = userData.mobileNumber;
            user.role = userData.role;
            user.pin = userData.pin;

            // ✅ Handle profile image
            let imageMeta = null;
            if (req.files && req.files.profileImage) {
                const file = Array.isArray(req.files.profileImage)
                    ? req.files.profileImage[0]
                    : req.files.profileImage;
                imageMeta = (
                    await Uploads.processFiles([file], "users", "img", undefined, "")
                )[0];
            }
            if (imageMeta) user.profileImage = imageMeta;
            else if (userData.profileImage) user.profileImage = userData.profileImage;

            user.createdAt = new Date();

            const savedUser = await user.save();
            return res.status(201).json({
                success: true,
                message: "User created successfully",
                data: savedUser,
            });
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : "An unknown error occurred";
            return res.status(500).json({
                success: false,
                message: errorMessage,
            });
        }
    }

    @Get("/list")
    @UseBefore(AuthMiddleware)
    async listUsers(
        @QueryParams() queryParams: ListUsersDto,
        @Res() res: Response
    ) {
        try {
            const {
                search,
                sortField = "createdAt",
                sortOrder = "desc",
            } = queryParams;
            const page = queryParams.page ?? 1;
            const limit = queryParams.limit ?? 100;
            const skip = (page - 1) * limit;

            const filter: FilterQuery<IUser> = { isDelete: 0 };

            if (search) {
                filter.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { email: { $regex: search, $options: "i" } },
                    { username: { $regex: search, $options: "i" } },
                    { companyName: { $regex: search, $options: "i" } },
                    { mobileNumber: { $regex: search, $options: "i" } },
                ];
            }

            const sort: { [key: string]: 1 | -1 } = {};
            sort[sortField] = sortOrder === "asc" ? 1 : -1;

            const [users, total] = await Promise.all([
                User.find(filter).sort(sort).skip(skip).limit(limit).populate("role"),
                User.countDocuments(filter),
            ]);

            return res.status(200).json({
                success: true,
                data: users,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit),
                },
            });
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : "An unknown error occurred";
            return res.status(500).json({
                success: false,
                message: errorMessage,
            });
        }
    }

    @Get("/by-role")
    @UseBefore(AuthMiddleware)
    async getUserByRole(@QueryParam("role") role: string, @Res() res: Response) {
        try {
            const user = await User.aggregate([
                {
                    $match: {
                        isDelete: 0,
                        isActive: 1,
                    },
                },
                {
                    $addFields: {
                        roleObjId: {
                            $toObjectId: "$role",
                        },
                    },
                },
                {
                    $lookup: {
                        from: "roles",
                        localField: "roleObjId",
                        foreignField: "_id",
                        as: "roleInfo",
                    },
                },
                {
                    $unwind: "$roleInfo",
                },
                {
                    $match: {
                        "roleInfo.name": {
                            $regex: `^${role}$`,
                            $options: "i",
                        },
                    },
                },
                {
                    $project: {
                        name: 1,
                        email: 1,
                        username: 1,
                        mobileNumber: 1,
                        roleName: "$roleInfo.name",
                        createdAt: 1,
                    },
                },
            ]);

            return res.status(200).json({
                success: true,
                data: user,
            });
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : "An unknown error occurred";
            return res.status(500).json({
                success: false,
                message: errorMessage,
            });
        }
    }

    @Get("/:id")
    @UseBefore(AuthMiddleware)
    async getUser(@Param("id") id: string, @Res() res: Response) {
        try {
            const user = await User.findById(id).populate({
                path: "role",
                populate: {
                    path: "permissions",
                    model: "Permission",
                },
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }
            return res.status(200).json({
                success: true,
                data: user,
            });
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : "An unknown error occurred";
            return res.status(500).json({
                success: false,
                message: errorMessage,
            });
        }
    }

    @Put("/:id")
    @UseBefore(AuthMiddleware)
    async updateUser(
        @Param("id") id: string,
        @Body({ validate: true }) userData: UpdateUserDto,
        @Res() res: Response,
        @Req() req: Request
    ) {
        try {
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }

            if (userData.name !== undefined) user.name = userData.name;
            if (userData.companyName !== undefined)
                user.companyName = userData.companyName;
            if (userData.email !== undefined) user.email = userData.email;

            // ✅ Check username uniqueness
            if (userData.username && userData.username !== user.username) {
                const existingUser = await User.findOne({
                    username: userData.username,
                    isDelete: 0,
                    _id: { $ne: id },
                });
                if (existingUser) {
                    return res.status(400).json({
                        success: false,
                        message: "Username already in use by another user",
                    });
                }
                user.username = userData.username;
            }

            // ✅ Check mobile number uniqueness
            if (
                userData.mobileNumber &&
                userData.mobileNumber !== user.mobileNumber
            ) {
                const existingUser = await User.findOne({
                    mobileNumber: userData.mobileNumber,
                    isDelete: 0,
                    _id: { $ne: id },
                });
                if (existingUser) {
                    return res.status(400).json({
                        success: false,
                        message: "Mobile number already in use by another user",
                    });
                }
                user.mobileNumber = userData.mobileNumber;
            }

            if (userData.role !== undefined) user.role = userData.role;

            // ✅ Handle profile image
            let imageMeta = null;
            if (req.files && req.files.profileImage) {
                const file = Array.isArray(req.files.profileImage)
                    ? req.files.profileImage[0]
                    : req.files.profileImage;
                imageMeta = (
                    await Uploads.processFiles([file], "users", "img", undefined, "")
                )[0];
            }
            if (imageMeta) user.profileImage = imageMeta;
            else if (userData.profileImage !== undefined)
                user.profileImage = userData.profileImage;

            user.updatedAt = new Date();
            user.updatedBy = (req as any).user.id;

            const updatedUser = await user.save();
            return res.status(200).json({
                success: true,
                message: "User updated successfully",
                data: updatedUser,
            });
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : "An unknown error occurred";
            return res.status(500).json({
                success: false,
                message: errorMessage,
            });
        }
    }

    @Delete("/:id")
    @UseBefore(AuthMiddleware)
    async deleteUser(
        @Param("id") id: string,
        @Res() res: Response,
        @Req() req: Request
    ) {
        try {
            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }

            user.isDelete = 1;
            user.deletedAt = new Date();
            user.deletedBy = (req as any).user.id;
            await user.save();

            return res.status(200).json({
                success: true,
                message: "User deleted successfully",
            });
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error ? error.message : "An unknown error occurred";
            return res.status(500).json({
                success: false,
                message: errorMessage,
            });
        }
    }
}
