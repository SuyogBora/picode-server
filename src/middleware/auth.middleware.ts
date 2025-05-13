import User from '@/models/user.model';
import { ApiError } from '@/types';
import { verifyAccessToken } from '@/utils/token';
import { NextFunction, Request, Response } from 'express';

// Middleware to protect routes with optional authentication
export const protect = (isRequired = true) => async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  let token: string | undefined;  

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  // If no token and authentication is required, return error
  if (!token && isRequired) {
    const error = new Error('Not authorized to access this route') as ApiError;
    error.statusCode = 401;
    return next(error);
  }
  
  // If no token and authentication is optional, just continue
  if (!token && !isRequired) {
    return next();
  }

  try {
    if (!token) {
      if (isRequired) {
        const error = new Error('Not authorized to access this route') as ApiError;
        error.statusCode = 401;
        return next(error);
      }
      return next();
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId).select('-password').populate({
      path: 'roles',
      populate: {
        path: 'permissions'
      }
    });

    if (!user) {
      if (isRequired) {
        const error = new Error('User not found') as ApiError;
        error.statusCode = 401;
        return next(error);
      }
      return next();
    }

    if (!user.isActive) {
      if (isRequired) {
        const error = new Error('User account is deactivated') as ApiError;
        error.statusCode = 401;
        return next(error);
      }
      return next();
    }

    req.user = user;
    next();
  } catch (err) {
    if (isRequired) {
      const error = new Error('Not authorized to access this route') as ApiError;
      error.statusCode = 401;
      return next(error);
    }
    next();
  }
};