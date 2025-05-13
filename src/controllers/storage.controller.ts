import { CopyFileBody, FileKeyParams, ListFilesQuery, PresignedUrlBody } from '@/schemas/storage.schema';
import { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';
import { ApiError } from '@/types';
import {
  copyFile,
  deleteFile,
  FileCategory,
  generatePresignedDownloadUrl,
  generatePresignedUploadUrl,
  getFileMetadata,
  listFiles,
  uploadFile
} from '@/utils/storage.utils';

/**
 * @desc    Generate presigned URL for file upload
 * @route   POST /api/storage/presigned-upload
 * @access  Private
 */
export const getPresignedUploadUrl = async (
  req: Request<{},{},PresignedUrlBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fileName, contentType, category } = req.body;
    console.log(fileName, contentType, category,"fileName, contentType, category")
    const userId = req.user?._id ? (req.user?._id as Types.ObjectId).toString() : null;

    const result = await generatePresignedUploadUrl(
      fileName,
      contentType,
      category,
      userId
    );
console.log(result,"result")
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate presigned URL for file download
 * @route   GET /api/storage/presigned-download/:key
 * @access  Private
 */
export const getPresignedDownloadUrl = async (
  req: Request<FileKeyParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { key } = req.params;

    const url = await generatePresignedDownloadUrl(key);

    res.status(200).json({
      success: true,
      data: { url }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload file directly to S3
 * @route   POST /api/storage/upload
 * @access  Private
 */
export const uploadFileToS3 = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      const error = new Error('No file uploaded') as ApiError;
      error.statusCode = 400;
      throw error;
    }

    const { buffer, originalname, mimetype } = req.file;
    const category = req.body.category as FileCategory || FileCategory.OTHER;
    const userId = (req.user?._id as Types.ObjectId).toString();

    const fileMetadata = await uploadFile(
      buffer,
      originalname,
      mimetype,
      category,
      userId
    );

    res.status(201).json({
      success: true,
      data: fileMetadata
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete file from S3
 * @route   DELETE /api/storage/:key
 * @access  Private
 */
export const deleteFileFromS3 = async (
  req: Request<FileKeyParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { key } = req.params;

    // Get file metadata to check ownership
    const metadata = await getFileMetadata(key);
    
    // Check if file exists
    if (!metadata) {
      const error = new Error('File not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    await deleteFile(key);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get file metadata
 * @route   GET /api/storage/metadata/:key
 * @access  Private
 */
export const getFileInfo = async (
  req: Request<FileKeyParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { key } = req.params;

    const metadata = await getFileMetadata(key);

    res.status(200).json({
      success: true,
      data: metadata
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    List files
 * @route   GET /api/storage/list
 * @access  Private
 */
export const listFilesInS3 = async (
  req: Request<{}, {}, {}, ListFilesQuery>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { category, prefix, maxKeys } = req.query;
    const userId = (req.user?._id as Types.ObjectId).toString();

    const files = await listFiles(
      category as FileCategory | undefined,
      userId,
      prefix as string | undefined,
      maxKeys ? parseInt(String(maxKeys), 10) : undefined
    );

    res.status(200).json({
      success: true,
      count: files.length,
      data: files
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Copy file to new location
 * @route   POST /api/storage/copy
 * @access  Private
 */
export const copyFileInS3 = async (
  req: Request<{},{},CopyFileBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { sourceKey, destinationCategory } = req.body;
    const userId = (req.user?._id as Types.ObjectId).toString();

    const newFile = await copyFile(
      sourceKey,
      destinationCategory,
      userId
    );

    res.status(201).json({
      success: true,
      data: newFile
    });
  } catch (error) {
    next(error);
  }
};