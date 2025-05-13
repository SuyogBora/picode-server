import { FileCategory } from '@/config/s3.config';
import { z } from 'zod';

// Schema for generating presigned URL
export const presignedUrlSchema = z.object({
  body: z.object({
    fileName: z.string().min(1, 'File name is required'),
    contentType: z.string().min(1, 'Content type is required'),
    category: z.nativeEnum(FileCategory, {
      errorMap: () => ({ message: 'Invalid file category' })
    }).default(FileCategory.OTHER)
  })
});

// Schema for file operations with key
export const fileKeySchema = z.object({
  params: z.object({
    key: z.string().min(1, 'File key is required')
  })
});

// Schema for listing files
export const listFilesSchema = z.object({
  query: z.object({
    category: z.nativeEnum(FileCategory, {
      errorMap: () => ({ message: 'Invalid file category' })
    }).optional(),
    prefix: z.string().optional(),
    maxKeys: z.string().optional().transform(val => val ? parseInt(val, 10) : 1000).optional()
  })
});

// Schema for copying files
export const copyFileSchema = z.object({
  body: z.object({
    sourceKey: z.string().min(1, 'Source key is required'),
    destinationCategory: z.nativeEnum(FileCategory, {
      errorMap: () => ({ message: 'Invalid destination category' })
    })
  })
});

export type PresignedUrlBody = z.infer<typeof presignedUrlSchema>['body'];
export type FileKeyParams = z.infer<typeof fileKeySchema>['params'];
export type ListFilesQuery = z.infer<typeof listFilesSchema>['query'];
export type CopyFileBody = z.infer<typeof copyFileSchema>['body'];