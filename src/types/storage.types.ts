export type FileCategory = 'blog' | 'career' | 'profile' | 'document' | 'other';

export interface PresignedUrlResponse {
  url: string;
  key: string;
  bucket: string;
  expiresAt: Date;
}

export interface FileMetadata {
  originalName: string;
  contentType: string;
  size: number;
  category: FileCategory;
  userId?: string;
  [key: string]: string | number | undefined;
}

export interface S3File {
  key: string;
  url: string;
  metadata: FileMetadata;
}

export interface PaginatedFiles {
  files: S3File[];
  nextContinuationToken?: string;
}


export interface S3Config {
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string; // For using with localstack or other S3-compatible services
  }