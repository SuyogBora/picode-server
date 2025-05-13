import { Permission, Role, User } from '@/models';
import { CreateRoleInput, RoleIdParam, RolePermissionsInput, UpdateRoleInput } from '@/schemas/auth.schema';
import { ApiError } from '@/types';
import { NextFunction, Request, Response } from 'express';

/**
 * @desc    Get all roles
 * @route   GET /api/roles
 * @access  Private (Admin)
 */
export const getRoles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const roles = await Role.find().populate('permissions');

    res.status(200).json({
      success: true,
      data: {
        roles
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get role by ID
 * @route   GET /api/roles/:id
 * @access  Private (Admin)
 */
export const getRoleById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const role = await Role.findById(id).populate('permissions');

    if (!role) {
      const error = new Error('Role not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      data: {
        role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new role
 * @route   POST /api/roles
 * @access  Private (Admin)
 */
export const createRole = async (req: Request<{},{},CreateRoleInput>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, permissions, isDefault } = req.body;

    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      const error = new Error('Role with this name already exists') as ApiError;
      error.statusCode = 400;
      throw error;
    }

    if (isDefault) {
      await Role.updateMany({ isDefault: true }, { isDefault: false });
    }

    if (permissions && permissions.length > 0) {
      const permissionIds = await Permission.find({ _id: { $in: permissions } }).distinct('_id');
      
      if (permissionIds.length !== permissions.length) {
        const error = new Error('One or more permission IDs are invalid') as ApiError;
        error.statusCode = 400;
        throw error;
      }
    }

    const role = await Role.create({
      name,
      description,
      permissions: permissions || [],
      isDefault: isDefault || false
    });

    await role.populate('permissions');

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: {
        role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a role
 * @route   PUT /api/roles/:id
 * @access  Private (Admin)
 */
export const updateRole = async (req: Request<RoleIdParam,{},UpdateRoleInput>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description, permissions, isDefault } = req.body;

    let role = await Role.findById(id);
    if (!role) {
      const error = new Error('Role not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    if (name && name !== role.name) {
      const existingRole = await Role.findOne({ name });
      if (existingRole) {
        const error = new Error('Role with this name already exists') as ApiError;
        error.statusCode = 400;
        throw error;
      }
    }

    if (isDefault && !role.isDefault) {
      await Role.updateMany({ isDefault: true }, { isDefault: false });
    }

    if (permissions && permissions.length > 0) {
      const permissionIds = await Permission.find({ _id: { $in: permissions } }).distinct('_id');
      
      if (permissionIds.length !== permissions.length) {
        const error = new Error('One or more permission IDs are invalid') as ApiError;
        error.statusCode = 400;
        throw error;
      }
    }

    role = await Role.findByIdAndUpdate(
      id,
      {
        name: name || role.name,
        description: description || role.description,
        permissions: permissions || role.permissions,
        isDefault: isDefault !== undefined ? isDefault : role.isDefault
      },
      { new: true, runValidators: true }
    ).populate('permissions');

    if (!role) {
      const error = new Error('Role not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      data: {
        role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a role
 * @route   DELETE /api/roles/:id
 * @access  Private (Admin)
 */
export const deleteRole = async (req: Request<RoleIdParam>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const role = await Role.findById(id);
    if (!role) {
      const error = new Error('Role not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    if (role.isDefault) {
      const error = new Error('Cannot delete the default role') as ApiError;
      error.statusCode = 400;
      throw error;
    }

    const usersWithRole = await User.countDocuments({ roles: id });
    if (usersWithRole > 0) {
      const error = new Error('Cannot delete a role that is assigned to users') as ApiError;
      error.statusCode = 400;
      throw error;
    }

    await Role.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add permissions to a role
 * @route   POST /api/roles/:id/permissions
 * @access  Private (Admin)
 */
export const addPermissionsToRole = async (req: Request<RoleIdParam,{},RolePermissionsInput>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    const role = await Role.findById(id);
    if (!role) {
      const error = new Error('Role not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      const error = new Error('Please provide an array of permission IDs') as ApiError;
      error.statusCode = 400;
      throw error;
    }

    const validPermissions = await Permission.find({ _id: { $in: permissions } }).distinct('_id');
    if (validPermissions.length !== permissions.length) {
      const error = new Error('One or more permission IDs are invalid') as ApiError;
      error.statusCode = 400;
      throw error;
    }

    const currentPermissionIds = role.permissions.map(p => p.toString());
    const newPermissions = permissions.filter(p => !currentPermissionIds.includes(p.toString()));

    if (newPermissions.length === 0) {
      res.status(200).json({
        success: true,
        message: 'No new permissions to add',
        data: {
          role: await Role.findById(id).populate('permissions')
        }
      });
      return;
    }

    const updatedRole = await Role.findByIdAndUpdate(
      id,
      { $addToSet: { permissions: { $each: newPermissions } } },
      { new: true, runValidators: true }
    ).populate('permissions');

    res.status(200).json({
      success: true,
      message: 'Permissions added to role successfully',
      data: {
        role: updatedRole
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove permissions from a role
 * @route   DELETE /api/roles/:id/permissions
 * @access  Private (Admin)
 */
export const removePermissionsFromRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    // Check if role exists
    const role = await Role.findById(id);
    if (!role) {
      const error = new Error('Role not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    // Validate permissions
    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      const error = new Error('Please provide an array of permission IDs') as ApiError;
      error.statusCode = 400;
      throw error;
    }

    const updatedRole = await Role.findByIdAndUpdate(
      id,
      { $pullAll: { permissions } },
      { new: true, runValidators: true }
    ).populate('permissions');

    res.status(200).json({
      success: true,
      message: 'Permissions removed from role successfully',
      data: {
        role: updatedRole
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set permissions for a role (replace all existing permissions)
 * @route   PUT /api/roles/:id/permissions
 * @access  Private (Admin)
 */
export const setRolePermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    const role = await Role.findById(id);
    if (!role) {
      const error = new Error('Role not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    if (!permissions || !Array.isArray(permissions)) {
      const error = new Error('Please provide an array of permission IDs') as ApiError;
      error.statusCode = 400;
      throw error;
    }

    if (permissions.length > 0) {
      const validPermissions = await Permission.find({ _id: { $in: permissions } }).distinct('_id');
      if (validPermissions.length !== permissions.length) {
        const error = new Error('One or more permission IDs are invalid') as ApiError;
        error.statusCode = 400;
        throw error;
      }
    }

    const updatedRole = await Role.findByIdAndUpdate(
      id,
      { permissions },
      { new: true, runValidators: true }
    ).populate('permissions');

    res.status(200).json({
      success: true,
      message: 'Role permissions updated successfully',
      data: {
        role: updatedRole
      }
    });
  } catch (error) {
    next(error);
  }
};