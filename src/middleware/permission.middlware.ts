import { ApiError } from '@/types';
import { NextFunction, Request, Response } from 'express';

// Middleware to authorize by permission
export const requirePermission = (...permissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req?.user) {
      const error = new Error('User not authenticated') as ApiError;
      error.statusCode = 401;
      return next(error);
    }
    
    // SuperAdmin always has access
    if (req.user.hasRole('SuperAdmin')) {
      return next();
    }

    // Check if user has any of the specified permissions directly
    const hasRequiredPermission = permissions.some(permission => 
      req.user!.hasPermission(permission)
    );
    
    if (hasRequiredPermission) {
      return next();
    }
    
    // If not, check if user has the 'manage' permission for the resources
    const hasManagePermission = permissions.some(permission => {
      const [resource] = permission.split(':');
      return req.user!.hasPermission(`${resource}:manage`) || req.user!.hasPermission('all:manage');
    });
    
    if (hasManagePermission) {
      return next();
    }

    const error = new Error('You do not have permission to perform this action') as ApiError;
    error.statusCode = 403;
    return next(error);
  };
};