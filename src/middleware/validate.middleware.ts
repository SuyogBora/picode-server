import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '@/types';

/**
 * Middleware to validate request using Zod schemas
 */
export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const apiError = new Error('Validation failed') as ApiError;
        apiError.statusCode = 400;
        apiError.errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        next(apiError);
      } else {
        next(error);
      }
    }
  };
};