import multer, { Multer } from 'multer';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../types';

// Make sure you have the Express namespace imported
// This is usually included with @types/express, but we'll declare it explicitly if needed
declare global {
  namespace Express {
    interface Request {
      file?: Multer.File;
      files?: {
        [fieldname: string]: Multer.File[];
      } | Multer.File[];
    }
  }
}

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function to validate file types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Define allowed MIME types
  const allowedMimeTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
    
    // Text
    'text/plain',
    'text/csv',
    
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    
    // Other
    'application/json'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`) as any);
  }
};

// Create multer upload instance
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter
});

// Middleware to handle multer errors
export const handleUploadErrors = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    const apiError = new Error(err.message) as ApiError;
    apiError.statusCode = 400;
    return next(apiError);
  } else if (err) {
    // An unknown error occurred
    const apiError = new Error(err.message) as ApiError;
    apiError.statusCode = 400;
    return next(apiError);
  }
  
  // No error occurred, continue
  next();
};