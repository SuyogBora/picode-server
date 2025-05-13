import { Role, User } from '@/models';
import { ChangePasswordInput, ForgotPasswordInput, LoginInput, RegisterInput, ResetPasswordInput, ResetPasswordParams } from '@/schemas/auth.schema';
import { ApiError } from '@/types';
import {
  clearTokenCookies,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from '@/utils/token';
import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import _ from "lodash";
import { Types } from 'mongoose';

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req: Request<{}, {}, RegisterInput>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, roleId } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      const error = new Error('User with this email already exists') as ApiError;
      error.statusCode = 400;
      throw error;
    }

    // Get role (custom or default)
    let role;
    if (roleId) {
      // If role ID is provided, use that role
      role = await Role.findById(roleId);
      if (!role) {
        const error = new Error('Role not found') as ApiError;
        error.statusCode = 400;
        throw error;
      }
    } else {
      // Otherwise use the default role
      role = await Role.findOne({ isDefault: true });
      if (!role) {
        const error = new Error('Default role not found') as ApiError;
        error.statusCode = 500;
        throw error;
      }
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password, // Will be hashed by pre-save hook
      roles: [role._id]
    });

    // Return user data (without password) and tokens
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email to verify your account.',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          roles: [role],
          isEmailVerified: user.isEmailVerified
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req: Request<{}, {}, LoginInput>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password').populate({
      path: 'roles',
      populate: {
        path: 'permissions'
      }
    });

    if (!user) {
      const error = new Error('Invalid credentials') as ApiError;
      error.statusCode = 401;
      throw error;
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      const error = new Error('Invalid credentials') as ApiError;
      error.statusCode = 401;
      throw error;
    }

    // Check if user is active
    if (!user.isActive) {
      const error = new Error('Your account has been deactivated') as ApiError;
      error.statusCode = 401;
      throw error;
    }

    // Generate tokens
    const accessToken = generateAccessToken((user._id as Types.ObjectId).toString());
    const refreshToken = generateRefreshToken((user._id as Types.ObjectId).toString());

    // Set cookies
    // setTokenCookies(res, accessToken, refreshToken);

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Return user data (without password) and tokens
    const userData = _.omit(user.toObject(), ['password']);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public (with refresh token)
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Get refresh token from cookie
    const refreshToken = req?.cookies?.refreshToken || req?.body?.refreshToken;
    if (!refreshToken) {
      const error = new Error('No refresh token provided') as ApiError;
      error.statusCode = 401;
      throw error;
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    
    // Check if user exists
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      const error = new Error('User not found') as ApiError;
      error.statusCode = 401;
      throw error;
    }

    if (!user.isActive) {
      const error = new Error('Your account has been deactivated') as ApiError;
      error.statusCode = 401;
      throw error;
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken((user._id as Types.ObjectId).toString());
    const newRefreshToken = generateRefreshToken((user._id as Types.ObjectId).toString());
    
    // Set new tokens in cookies

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      }
    });
  } catch (error) {
    // Clear cookies on error
    clearTokenCookies(res);
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Clear cookies
    clearTokenCookies(res);
    
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot password
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req: Request<{},{},ForgotPasswordInput>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    
    // If user doesn't exist, still return success (security)
    if (!user) {
      res.status(200).json({
        success: true,
        message: 'If your email is registered, you will receive a password reset link'
      });
      return;
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Send email
    try {
    //   await sendEmail({
    //     to: user.email,
    //     subject: 'Password Reset',
    //     text: `You requested a password reset. Please go to: ${resetUrl}`,
    //     html: `
    //       <div>
    //         <h1>Password Reset</h1>
    //         <p>You requested a password reset. Please click the link below to reset your password:</p>
    //         <a href="${resetUrl}" target="_blank">Reset Password</a>
    //         <p>This link will expire in 10 minutes.</p>
    //         <p>If you didn't request this, please ignore this email.</p>
    //       </div>
    //     `
    //   });
    } catch (error) {
      console.error('Password reset email could not be sent', error);
      // Continue execution - don't expose email sending errors to client for security
    }

    res.status(200).json({
      success: true,
      message: 'If your email is registered, you will receive a password reset link'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset password
 * @route   POST /api/auth/reset-password/:token
 * @access  Public
 */
export const resetPassword = async (req: Request<ResetPasswordParams,{},ResetPasswordInput>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash the token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      const error = new Error('Invalid or expired token') as ApiError;
      error.statusCode = 400;
      throw error;
    }

    // Set new password
    user.password = password;
    
    // Clear reset fields
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify email
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.params;

    // Hash the token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with matching token
    const user = await User.findOne({ emailVerificationToken: hashedToken });

    if (!user) {
      const error = new Error('Invalid verification token') as ApiError;
      error.statusCode = 400;
      throw error;
    }

    // Mark email as verified and clear verification token
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
export const changePassword = async (req: Request<{},{},ChangePasswordInput>, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!req.user || !req.user._id) {
      const error = new Error('User not authenticated') as ApiError;
      error.statusCode = 401;
      throw error;
    }
    
    // Get user with password
    const user = await User.findById(req.user._id).select('+password');
    
    if (!user) {
      const error = new Error('User not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    // Check if current password is correct
    const isMatch = await user.matchPassword(currentPassword);
    
    if (!isMatch) {
      const error = new Error('Current password is incorrect') as ApiError;
      error.statusCode = 401;
      throw error;
    }

    // Set new password
    user.password = newPassword;
    await user.save();

    // Clear cookies to force re-login
    clearTokenCookies(res);
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully. Please log in again with your new password.'
    });
  } catch (error) {
    next(error);
  }
};