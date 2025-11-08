import {
  JsonController,
  Post,
  Get,
  Body,
  Param,
  QueryParams,
  Res,
  Put,
  Delete
} from 'routing-controllers';
import { Response } from 'express';
import { CreateRoleDto } from '../../dto/create-role.dto';
import { ListRolesDto } from '../../dto/list-roles.dto';
import { Role, IRole } from '../../models/role.model';
import { FilterQuery } from 'mongoose';

@JsonController('/api/admin/roles')
export default class RoleController {

  @Post('/')
  async createRole(
    @Body({ validate: true }) roleData: CreateRoleDto,
    @Res() res: Response
  ) {
    try {
      const existingRole = await Role.findOne({
        name: { $regex: `^${roleData.name.trim()}$`, $options: 'i' },
        isDelete: 0
      });

      if (existingRole) {
        return res.status(400).json({
          success: false,
          message: 'Role name must be unique'
        });
      }

      const role = new Role();
      role.name = roleData.name.trim();
      role.permissions = roleData.permissions as any;

      const savedRole = await role.save();

      return res.status(201).json({
        success: true,
        message: 'Role created successfully',
        data: savedRole
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create role',
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  }


  @Get('/list')
  async listRoles(
    @QueryParams({ validate: true }) queryParams: ListRolesDto,
    @Res() res: Response
  ) {
    try {
      const {
        search,
        sortField = 'createdAt',
        sortOrder = 'desc',
        page,
        limit
      } = queryParams;

      const query: FilterQuery<IRole> = { isDelete: 0 };

      if (search) {
        query.$or = [{ name: { $regex: search, $options: 'i' } }];
      }

      let rolesQuery = Role.find(query)
        .populate('permissions')
        .sort({ [sortField]: sortOrder === 'asc' ? 1 : -1 });

      let totalQuery = Role.countDocuments(query);

      if (page && limit) {
        const skip = (page - 1) * limit;
        rolesQuery = rolesQuery.skip(skip).limit(limit);
      }

      const [roles, total] = await Promise.all([
        rolesQuery.exec(),
        totalQuery.exec()
      ]);

      const response: any = {
        success: true,
        message: 'Roles listed successfully',
        data: roles
      };

      if (page && limit) {
        response.pagination = {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        };
      }

      return res.status(200).json(response);
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        message: 'Failed to list roles',
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  }

  @Get('/:id')
  async getRoleById(@Param('id') id: string, @Res() res: Response) {
    try {
      const role = await Role.findById(id)
        .where({ isDelete: 0 })
        .populate('permissions');

      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Role retrieved successfully',
        data: role
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch role',
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  }

  @Put('/:id')
  async updateRole(
    @Param('id') id: string,
    @Body({ validate: true }) roleData: CreateRoleDto,
    @Res() res: Response
  ) {
    try {
      const role = await Role.findById(id).where({ isDelete: 0 });
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }
      const existingRole = await Role.findOne({
        name: { $regex: `^${roleData.name.trim()}$`, $options: 'i' },
        _id: { $ne: id },
        isDelete: 0
      });

      if (existingRole) {
        return res.status(400).json({
          success: false,
          message: 'Role name must be unique'
        });
      }

      role.name = roleData.name.trim();
      role.permissions = roleData.permissions as any;
      role.updatedAt = new Date();

      const updatedRole = await role.save();

      return res.status(200).json({
        success: true,
        message: 'Role updated successfully',
        data: updatedRole
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update role',
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  }

  @Delete('/:id')
  async deleteRole(@Param('id') id: string, @Res() res: Response) {
    try {
      const role = await Role.findById(id).where({ isDelete: 0 });
      if (!role) {
        return res.status(404).json({
          success: false,
          message: 'Role not found'
        });
      }

      role.isDelete = 1;
      role.deletedAt = new Date();
      await role.save();

      return res.status(200).json({
        success: true,
        message: 'Role deleted successfully'
      });
    } catch (error: unknown) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete role',
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  }
}
