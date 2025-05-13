import express from 'express';
import { 
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  uploadFileToS3,
  deleteFileFromS3,
  getFileInfo,
  listFilesInS3,
  copyFileInS3
} from '../controllers/storage.controller';
import { protect } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middlware';
import { upload, handleUploadErrors } from '../middleware/upload.middleware';
import { validate } from '../middleware/validate.middleware';
import { 
  presignedUrlSchema,
  fileKeySchema,
  listFilesSchema,
  copyFileSchema
} from '../schemas/storage.schema';

const router = express.Router();

// Apply protection to all routes
// router.use(protect(true));

// For storage routes, we'll need to decide which resource type they fall under
// Since there's no specific storage resource, we could use a general 'manage' permission
// or create a new resource type. For now, let's use basic authentication.

// Presigned URL routes
router.post(
  '/presigned-upload',
  validate(presignedUrlSchema),
  getPresignedUploadUrl
);

router.get(
  '/presigned-download/:key',
  validate(fileKeySchema),
  getPresignedDownloadUrl
);

// Direct upload route
router.post(
  '/upload',
  upload.single('file'),
  handleUploadErrors,
  uploadFileToS3
);

// File operations
router.delete(
  '/:key',
  validate(fileKeySchema),
  deleteFileFromS3
);

router.get(
  '/metadata/:key',
  validate(fileKeySchema),
  getFileInfo
);

router.get(
  '/list',
  validate(listFilesSchema),
  listFilesInS3
);

router.post(
  '/copy',
  validate(copyFileSchema),
  copyFileInS3
);

export default router;