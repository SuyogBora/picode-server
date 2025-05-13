import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../types';
import { Types } from 'mongoose';

// Define proper types for JWT payloads
export interface JwtPayload {
  userId: string;
}

/**
 * Generate access token
 */
export const generateAccessToken = (userId: any): string => {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error('JWT_ACCESS_SECRET is not defined');
  }

  return jwt.sign(
    { userId } as any,
    process.env.JWT_ACCESS_SECRET,
    { expiresIn:'15m' }
  );
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (userId: string | Types.ObjectId): string => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not defined');
  }

  return jwt.sign(
    { userId } as JwtPayload,
    process.env.JWT_REFRESH_SECRET,
    { expiresIn:'7d' }
  );
};

/**
 * Set HTTP-only cookies for both tokens
 */
export const setTokenCookies = (res: Response, accessToken: string, refreshToken: string): void => {
  // Set access token cookie
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: parseInt(process.env.JWT_ACCESS_EXPIRES_NUM || '900') * 1000 // 15 minutes in milliseconds
  });

  // Set refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: parseInt(process.env.JWT_REFRESH_EXPIRES_NUM || '604800') * 1000 // 7 days in milliseconds
  });
};

/**
 * Clear auth cookies
 */
export const clearTokenCookies = (res: Response): void => {
  res.cookie('accessToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0)
  });

  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: new Date(0)
  });
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token: string): JwtPayload => {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error('JWT_ACCESS_SECRET is not defined');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    return decoded as JwtPayload;
  } catch (error: any) {
    const apiError = new Error(error.message || 'Invalid access token') as ApiError;
    apiError.statusCode = 401;
    throw apiError;
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token: string): JwtPayload => {
  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is not defined');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    return decoded as JwtPayload;
  } catch (error: any) {
    const apiError = new Error(error.message || 'Invalid refresh token') as ApiError;
    apiError.statusCode = 401;
    throw apiError;
  }
};