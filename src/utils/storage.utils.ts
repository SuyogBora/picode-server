import { s3Client } from '@/config/s3.config';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { ApiError } from '../types';

const BUCKET_NAME = process.env.AWS_S3_BUCKET || '';

export enum FileCategory {
  PROFILE = 'profile',
  BLOG = 'blog',
  CAREER = 'career',
  DOCUMENT = 'document',
  OTHER = 'other'
}

export interface FileMetadata {
  key: string;
  url: string;
  size: number;
  contentType: string;
  category: FileCategory;
  originalName: string;
  createdAt: Date;
  lastModified?: Date;
}

/**
 * Generate a unique file key with category prefix
 */
export const generateFileKey = (
  fileName: string, 
  category: FileCategory = FileCategory.OTHER,
  userId?: string | null
): string => {
  const fileExtension = fileName.split('.').pop() || '';
  const uniqueId = uuidv4();
  const userPrefix = userId ? `${userId}-` : '';
  
  return `${category}-${userPrefix}${uniqueId}.${fileExtension}`;
};

/**
 * Generate a presigned URL for uploading a file
 */
export const generatePresignedUploadUrl = async (
  fileName: string,
  contentType: string,
  category: FileCategory = FileCategory.OTHER,
  userId?: string | null,
  expiresIn = 3600
): Promise<{ url: string; key: string }> => {
  try {
    if (!BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET is not defined');
    }

    const key = generateFileKey(fileName, category, userId);
    console.log(key,"key")
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      Metadata: {
        'original-name': encodeURIComponent(fileName),
        'category': category,
        ...(userId && { 'user-id': userId })
      }
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });

    return { url, key };
  } catch (error: any) {
    console.error('Error generating presigned upload URL:', error);
    const apiError = new Error('Failed to generate upload URL') as ApiError;
    apiError.statusCode = 500;
    throw apiError;
  }
};

/**
 * Generate a presigned URL for downloading a file
 */
export const generatePresignedDownloadUrl = async (
  key: string,
  expiresIn = 3600 
): Promise<string> => {
  try {
    if (!BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET is not defined');
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error: any) {
    console.error('Error generating presigned download URL:', error);
    const apiError = new Error('Failed to generate download URL') as ApiError;
    apiError.statusCode = 500;
    throw apiError;
  }
};

/**
 * Upload a file directly to S3
 */
export const uploadFile = async (
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
  category: FileCategory = FileCategory.OTHER,
  userId?: string
): Promise<FileMetadata> => {
  try {
    if (!BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET is not defined');
    }

    const key = generateFileKey(fileName, category, userId);
    
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: {
          'original-name': encodeURIComponent(fileName),
          'category': category,
          ...(userId && { 'user-id': userId })
        }
      }
    });

    await upload.done();
    
    const url = await generatePresignedDownloadUrl(key);
    
    return {
      key,
      url,
      size: fileBuffer.length,
      contentType,
      category,
      originalName: fileName,
      createdAt: new Date()
    };
  } catch (error: any) {
    console.error('Error uploading file:', error);
    const apiError = new Error('Failed to upload file') as ApiError;
    apiError.statusCode = 500;
    throw apiError;
  }
};

/**
 * Delete a file from S3
 */
export const deleteFile = async (key: string): Promise<void> => {
  try {
    if (!BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET is not defined');
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    await s3Client.send(command);
  } catch (error: any) {
    console.error('Error deleting file:', error);
    const apiError = new Error('Failed to delete file') as ApiError;
    apiError.statusCode = 500;
    throw apiError;
  }
};

/**
 * Get file metadata from S3
 */
export const getFileMetadata = async (key: string): Promise<FileMetadata> => {
  try {
    if (!BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET is not defined');
    }

    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    const response = await s3Client.send(command);
    
    // Extract category and original name from metadata
    const metadata = response.Metadata || {};
    const category = (metadata['category'] as FileCategory) || FileCategory.OTHER;
    const originalName = metadata['original-name'] 
      ? decodeURIComponent(metadata['original-name']) 
      : key.split('/').pop() || 'unknown';
    
    const url = await generatePresignedDownloadUrl(key);
    
    return {
      key,
      url,
      size: response.ContentLength || 0,
      contentType: response.ContentType || 'application/octet-stream',
      category,
      originalName,
      createdAt: response.LastModified || new Date(),
      lastModified: response.LastModified
    };
  } catch (error: any) {
    console.error('Error getting file metadata:', error);
    const apiError = new Error('Failed to get file metadata') as ApiError;
    apiError.statusCode = 500;
    throw apiError;
  }
};

/**
 * List files in a category
 */
export const listFiles = async (
  category?: FileCategory,
  userId?: string,
  prefix?: string,
  maxKeys = 1000
): Promise<FileMetadata[]> => {
  try {
    if (!BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET is not defined');
    }

    let fullPrefix = '';
    if (category) {
      fullPrefix = `${category}/`;
      if (userId) {
        fullPrefix += `${userId}/`;
      }
    } else if (userId) {
      fullPrefix = '';
    }

    if (prefix) {
      fullPrefix += prefix;
    }

    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: fullPrefix,
      MaxKeys: maxKeys
    });

    const response = await s3Client.send(command);
    
    if (!response.Contents || response.Contents.length === 0) {
      return [];
    }

    const filePromises = response.Contents.map(async (item) => {
      if (!item.Key) return null;
      
      try {
        return await getFileMetadata(item.Key);
      } catch (error) {
        console.error(`Error getting metadata for ${item.Key}:`, error);
        return null;
      }
    });

    const files = await Promise.all(filePromises);
    
    return files.filter((file): file is FileMetadata => file !== null);
  } catch (error: any) {
    console.error('Error listing files:', error);
    const apiError = new Error('Failed to list files') as ApiError;
    apiError.statusCode = 500;
    throw apiError;
  }
};

/**
 * Copy a file to a new location in S3
 */
export const copyFile = async (
  sourceKey: string,
  destinationCategory: FileCategory,
  userId?: string
): Promise<FileMetadata> => {
  try {
    if (!BUCKET_NAME) {
      throw new Error('AWS_S3_BUCKET is not defined');
    }

    const sourceMetadata = await getFileMetadata(sourceKey);
    
    const destinationKey = generateFileKey(
      sourceMetadata.originalName,
      destinationCategory,
      userId
    );
    
    const command = new CopyObjectCommand({
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${sourceKey}`,
      Key: destinationKey,
      Metadata: {
        'original-name': encodeURIComponent(sourceMetadata.originalName),
        'category': destinationCategory,
        ...(userId && { 'user-id': userId })
      },
      MetadataDirective: 'REPLACE'
    });

    await s3Client.send(command);
    
    return await getFileMetadata(destinationKey);
  } catch (error: any) {
    console.error('Error copying file:', error);
    const apiError = new Error('Failed to copy file') as ApiError;
    apiError.statusCode = 500;
    throw apiError;
  }
};