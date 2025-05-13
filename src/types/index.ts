import { IUser } from '@/models/user.model';
import { Request, Response, NextFunction } from 'express';

// Custom error interface
export interface ApiError extends Error {
  statusCode?: number;
  errors?: any[];
}

// Controller method type
export type ControllerMethod = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any> | any;


// Pagination params
export interface PaginationParams {
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
}

// API response interface
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: PaginationParams;
}