import express from 'express';
import {
  getEmailSettings,
  updateEmailSettings
} from '@/controllers/settings.controller';
import { protect } from '@/middleware/auth.middleware';
import { requirePermission } from '@/middleware/permission.middlware';

const router = express.Router();

// Apply protection to all routes
router.use(protect(true));

// Email settings routes
router.route('/email')
  .get(requirePermission('settings:read'), getEmailSettings)
  .put(requirePermission('settings:update'), updateEmailSettings);

export default router;