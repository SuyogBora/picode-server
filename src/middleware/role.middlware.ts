import { ApiError } from '@/types';
import { NextFunction, Response,Request } from 'express';

// Middleware to authorize by role
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const error = new Error('User not authenticated') as ApiError;
      error.statusCode = 401;
      return next(error);
    }

    if (req.user.hasRole('SuperAdmin')) {
      return next();
    }

    const hasRequiredRole = roles.some(role => req.user!.hasRole(role));
    console.log(hasRequiredRole,"hasRequiredRole")
    if (!hasRequiredRole) {
      const error = new Error('Not authorized to access this route') as ApiError;
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
};