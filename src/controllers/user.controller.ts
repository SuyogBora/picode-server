import { Role, User } from '@/models';
import { UserIdParams, UserQueryParams } from '@/schemas/users.schema';
import { ApiError } from '@/types';
import { mongoUtils } from '@/utils/common';
import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';

/**
 * @desc    Get user roles
 * @route   GET /api/users/:userId/roles
 * @access  Private (Admin)
 */
export const getUserRoles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId).populate({
      path: 'roles',
      populate: {
        path: 'permissions'
      }
    });

    if (!user) {
      const error = new Error('User not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      data: {
        roles: user.roles
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign roles to a user
 * @route   POST /api/users/:userId/roles
 * @access  Private (Admin)
 */
export const assignRolesToUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const { roles } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    // Validate roles
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      const error = new Error('Please provide an array of role IDs') as ApiError;
      error.statusCode = 400;
      throw error;
    }

    // Check if all roles exist
    const validRoles = await Role.find({ _id: { $in: roles } }).distinct('_id');
    if (validRoles.length !== roles.length) {
      const error = new Error('One or more role IDs are invalid') as ApiError;
      error.statusCode = 400;
      throw error;
    }

    // Add roles to user (avoiding duplicates)
    const currentRoleIds = user.roles.map(r => r.toString());
    const newRoles = roles.filter(r => !currentRoleIds.includes(r.toString()));

    if (newRoles.length === 0) {
      res.status(200).json({
        success: true,
        message: 'No new roles to assign',
        data: {
          user: await User.findById(userId).populate({
            path: 'roles',
            populate: {
              path: 'permissions'
            }
          })
        }
      });
      return;
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { roles: { $each: newRoles } } },
      { new: true, runValidators: true }
    ).populate({
      path: 'roles',
      populate: {
        path: 'permissions'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Roles assigned to user successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove roles from a user
 * @route   DELETE /api/users/:userId/roles
 * @access  Private (Admin)
 */
export const removeRolesFromUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const { roles } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      const error = new Error('Please provide an array of role IDs') as ApiError;
      error.statusCode = 400;
      throw error;
    }

    const userRoles = user.roles.map(r => r.toString());
    const rolesToRemove = roles.filter(r => userRoles.includes(r.toString()));
    const remainingRoles = userRoles.filter(r => !rolesToRemove.includes(r));

    if (remainingRoles.length === 0) {
      const error = new Error('User must have at least one role') as ApiError;
      error.statusCode = 400;
      throw error;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $pullAll: { roles } },
      { new: true, runValidators: true }
    ).populate({
      path: 'roles',
      populate: {
        path: 'permissions'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Roles removed from user successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set user roles (replace all existing roles)
 * @route   PUT /api/users/:userId/roles
 * @access  Private (Admin)
 */
export const setUserRoles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const { roles } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      const error = new Error('Please provide a non-empty array of role IDs') as ApiError;
      error.statusCode = 400;
      throw error;
    }

    const validRoles = await Role.find({ _id: { $in: roles } }).distinct('_id');
    if (validRoles.length !== roles.length) {
      const error = new Error('One or more role IDs are invalid') as ApiError;
      error.statusCode = 400;
      throw error;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { roles },
      { new: true, runValidators: true }
    ).populate({
      path: 'roles',
      populate: {
        path: 'permissions'
      }
    });

    res.status(200).json({
      success: true,
      message: 'User roles updated successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (
  req: Request<{}, {}, {}, UserQueryParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      name,
      email,
      role,
      isActive,
      isEmailVerified,
      search,
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = req.query;

    // Build match stage
    const matchStage: Record<string, any> = {};

    // Add text filters with regex
    if (name) matchStage.name = { $regex: name, $options: 'i' };
    if (email) matchStage.email = { $regex: email, $options: 'i' };
    
    // Process role filter using our utility function
    const roleQuery = mongoUtils.createIdQuery('roles', role);
    if (roleQuery) {
      Object.assign(matchStage, roleQuery);
    }
    
    // Process boolean filters
    const parsedIsActive = mongoUtils.parseBoolean(isActive);
    if (parsedIsActive !== undefined) {
      matchStage.isActive = parsedIsActive;
    }
    
    const parsedIsEmailVerified = mongoUtils.parseBoolean(isEmailVerified);
    if (parsedIsEmailVerified !== undefined) {
      matchStage.isEmailVerified = parsedIsEmailVerified;
    }

    // Add search functionality
    if (search) {
      const searchQuery = mongoUtils.createSearchQuery(['name', 'email'], search);
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
    console.log(matchStage,"matchStage")
    // Match stage
    aggregationPipeline.push({ $match: matchStage });
    
    // Lookup roles
    aggregationPipeline.push({
      $lookup: {
        from: 'roles',
        localField: 'roles',
        foreignField: '_id',
        as: 'roles'
      }
    });
    
    // Project fields
    aggregationPipeline.push({
      $project: {
        name: 1,
        email: 1,
        roles: {
          _id: 1,
          name: 1,
          description: 1
        },
        isActive: 1,
        isEmailVerified: 1,
        lastLoginAt: 1,
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
        users: '$data',
        pagination: { $arrayElemAt: ['$metadata', 0] }
      }
    });

    const result = await User.aggregate(aggregationPipeline);
    const { users, pagination } = result[0] || { users: [], pagination: null };

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: {
        items: users,
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
 * @desc    Get single user by ID
 * @route   GET /api/users/:id
 * @access  Private (Admin)
 */
export const getUser = async (
  req: Request<UserIdParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .populate({
        path: 'roles',
        populate: {
          path: 'permissions'
        }
      })
      .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken');

    if (!user) {
      const error = new Error('User not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: {
        user
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new user
 * @route   POST /api/users
 * @access  Private (Admin)
 */
export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password, roles } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const error = new Error('User already exists with this email') as ApiError;
      error.statusCode = 400;
      throw error;
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      roles
    });

    // Populate roles and permissions
    const populatedUser = await User.findById(user._id)
      .populate({
        path: 'roles',
        populate: {
          path: 'permissions'
        }
      })
      .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken');

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: populatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private (Admin)
 */
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, email, isActive, isEmailVerified, roles, password, currentPassword, newPassword } = req.body;

    // Check if user exists - include password field for password validation if needed
    const user = await User.findById(id).select('+password');
    if (!user) {
      const error = new Error('User not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    // Update user fields
    if (name) user.name = name;
    if (email) user.email = email;
    
    // Fix for Type 'boolean | undefined' error - ensure we're always setting a boolean
    if (isActive !== undefined) {
      user.isActive = mongoUtils.parseBoolean(isActive) ?? user.isActive;
    }
    
    if (isEmailVerified !== undefined) {
      user.isEmailVerified = mongoUtils.parseBoolean(isEmailVerified) ?? user.isEmailVerified;
    }
    
    // Handle password updates
    if (password) {
      // Direct password update (admin operation)
      user.password = password;
    } else if (currentPassword && newPassword) {
      // Password change with verification (user operation)
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        const error = new Error('Current password is incorrect') as ApiError;
        error.statusCode = 400;
        throw error;
      }
      user.password = newPassword;
    }
    
    // Update roles if provided
    if (roles) {
      const validRoles = mongoUtils.parseIds(roles);
      if (validRoles && validRoles.length > 0) {
        user.roles = validRoles;
      }
    }

    await user.save();

    // Populate roles and permissions
    const populatedUser = await User.findById(user._id)
      .populate({
        path: 'roles',
        populate: {
          path: 'permissions'
        }
      })
      .select('-password -passwordResetToken -passwordResetExpires -emailVerificationToken');

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: populatedUser
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private (Admin)
 */
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      const error = new Error('User not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    // Prevent deletion of admin users (optional)
    const isAdmin = await user.hasRole('Admin');
    if (isAdmin) {
      const error = new Error('Cannot delete admin users') as ApiError;
      error.statusCode = 403;
      throw error;
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: {
        id
      }
    });
  } catch (error) {
    next(error);
  }
};