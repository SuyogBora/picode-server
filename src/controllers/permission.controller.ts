import { Permission, Role } from '@/models';
import { CreatePermissionInput, PermissionIdParam, UpdatePermissionInput } from '@/schemas/auth.schema';
import { ApiError } from '@/types';
import { mongoUtils } from '@/utils/common';
import { NextFunction, Request, Response } from 'express';

/**
 * @desc    Get all permissions
 * @route   GET /api/permissions
 * @access  Private (Admin)
 */
export interface PermissionQueryParams {
  name?: string;
  resource?: string;
  search?: string;
  page?: number | string;
  limit?: number | string;
  sort?: string;
}

export const getPermissions = async (
  req: Request<{}, {}, {}, PermissionQueryParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      name,
      resource,
      search,
      page = 1,
      limit = 100,
      sort = '-createdAt'
    } = req.query;

    // Build match stage
    const matchStage: Record<string, any> = {};

    // Add text filters with regex
    if (name) matchStage.name = { $regex: name, $options: 'i' };
    if (resource) matchStage.resource = { $regex: resource, $options: 'i' };

    // Add search functionality
    if (search) {
      const searchQuery = mongoUtils.createSearchQuery(['name', 'resource', 'description'], search);
      if (searchQuery) {
        Object.assign(matchStage, searchQuery);
      }
    }

    // Pagination calculations
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Build aggregation pipeline
    const aggregationPipeline: any[] = [];

    // Match stage
    aggregationPipeline.push({ $match: matchStage });

    // Add virtual fields
    aggregationPipeline.push({
      $addFields: {
        code: { $concat: ["$resource", ":", "$name"] }
      }
    });

    // Project fields
    aggregationPipeline.push({
      $project: {
        name: 1,
        resource: 1,
        description: 1,
        code: 1,
        createdAt: 1,
        updatedAt: 1
      }
    });

    // Add sorting
    if (sort) {
      const sortStage: Record<string, number> = {};
      const sortFields = sort.split(',');

      sortFields.forEach(field => {
        const sortOrder = field.startsWith('-') ? -1 : 1;
        const fieldName = field.replace(/^-/, '');
        sortStage[fieldName] = sortOrder;
      });

      aggregationPipeline.push({ $sort: sortStage });
    }

    // Facet for pagination and results
    aggregationPipeline.push({
      $facet: {
        metadata: [
          { $count: 'total' },
          {
            $addFields: {
              page: pageNum,
              limit: limitNum,
              pages: { $ceil: { $divide: ['$total', limitNum] } }
            }
          }
        ],
        data: [
          { $skip: skip },
          { $limit: limitNum }
        ]
      }
    });

    // Reshape output
    aggregationPipeline.push({
      $project: {
        permissions: '$data',
        pagination: { $arrayElemAt: ['$metadata', 0] }
      }
    });

    const result = await Permission.aggregate(aggregationPipeline);
    const { permissions, pagination } = result[0] || { permissions: [], pagination: null };

    res.status(200).json({
      success: true,
      message: 'Permissions retrieved successfully',
      data: {
        items: permissions,
        pagination: pagination || {
          page: pageNum,
          limit: limitNum,
          total: 0,
          pages: 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get permission by ID
 * @route   GET /api/permissions/:id
 * @access  Private (Admin)
 */
export const getPermissionById = async (req: Request<PermissionIdParam>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const permission = await Permission.findById(id);

    if (!permission) {
      const error = new Error('Permission not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      data: {
        permission
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new permission
 * @route   POST /api/permissions
 * @access  Private (Admin)
 */
export const createPermission = async (req: Request<{}, {}, CreatePermissionInput>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, resource, description } = req.body;

    // Check if permission already exists
    const permissionExists = await Permission.findOne({ name, resource });
    if (permissionExists) {
      const error = new Error(`Permission '${resource}:${name}' already exists`) as ApiError;
      error.statusCode = 400;
      throw error;
    }

    // Create permission
    const permission = await Permission.create({
      name,
      resource,
      description
    });

    res.status(201).json({
      success: true,
      message: 'Permission created successfully',
      data: {
        permission
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a permission
 * @route   PUT /api/permissions/:id
 * @access  Private (Admin)
 */
export const updatePermission = async (req: Request<PermissionIdParam, {}, UpdatePermissionInput>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, resource, description } = req.body;

    // Check if permission exists
    let permission = await Permission.findById(id);
    if (!permission) {
      const error = new Error('Permission not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    // Check if updated name/resource combo already exists (if changing)
    if ((name && name !== permission.name) || (resource && resource !== permission.resource)) {
      const permissionExists = await Permission.findOne({
        name: name || permission.name,
        resource: resource || permission.resource,
        _id: { $ne: id }
      });

      if (permissionExists) {
        const error = new Error(`Permission '${resource || permission.resource}:${name || permission.name}' already exists`) as ApiError;
        error.statusCode = 400;
        throw error;
      }
    }

    // Update permission
    permission = await Permission.findByIdAndUpdate(
      id,
      {
        name: name || permission.name,
        resource: resource || permission.resource,
        description: description || permission.description
      },
      { new: true, runValidators: true }
    );

    if (!permission) {
      const error = new Error('Permission not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Permission updated successfully',
      data: {
        permission
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a permission
 * @route   DELETE /api/permissions/:id
 * @access  Private (Admin)
 */
export const deletePermission = async (req: Request<PermissionIdParam>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if permission exists
    const permission = await Permission.findById(id);
    if (!permission) {
      const error = new Error('Permission not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    // Check if permission is used by any roles
    const rolesWithPermission = await Role.countDocuments({ permissions: id });
    if (rolesWithPermission > 0) {
      const error = new Error('Cannot delete a permission that is assigned to roles') as ApiError;
      error.statusCode = 400;
      throw error;
    }

    // Delete permission
    await Permission.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Permission deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};