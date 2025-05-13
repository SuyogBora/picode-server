import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

const requiredEnvVars = [
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_BUCKET'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Environment variable ${envVar} is required`);
  }
}

export const s3Client = new S3Client({
  region: process.env.AWS_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string
  }
});

export const bucketName = process.env.AWS_S3_BUCKET as string;

export enum FileCategory {
  PROFILE = 'profile',
  BLOG = 'blog',
  CAREER = 'career',
  DOCUMENT = 'document',
  OTHER = 'other'
}

export const FILE_SIZE_LIMITS = {
  [FileCategory.PROFILE]: 5 * 1024 * 1024, // 5MB
  [FileCategory.BLOG]: 10 * 1024 * 1024, // 10MB
  [FileCategory.CAREER]: 10 * 1024 * 1024, // 10MB
  [FileCategory.DOCUMENT]: 20 * 1024 * 1024, // 20MB
  [FileCategory.OTHER]: 5 * 1024 * 1024 // 5MB
};

export const ALLOWED_MIME_TYPES = {
  [FileCategory.PROFILE]: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  [FileCategory.BLOG]: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  [FileCategory.CAREER]: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  [FileCategory.DOCUMENT]: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
  ],
  [FileCategory.OTHER]: ['*/*']
};

export const URL_EXPIRATION = {
  UPLOAD: 15 * 60, // 15 minutes
  DOWNLOAD: 60 * 60 // 1 hour
};