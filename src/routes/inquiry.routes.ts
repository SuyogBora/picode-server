import express from 'express';
import {
  assignInquiry,
  createInquiry,
  deleteInquiry,
  getInquiries,
  getInquiry,
  updateInquiry,
  updateInquiryStatus
} from '@/controllers/inquiry.controller';
import { protect } from '@/middleware/auth.middleware';
import { requirePermission } from '@/middleware/permission.middlware';
import { validate } from '@/middleware/validate.middleware';
import {
  assignInquirySchema,
  createInquirySchema,
  inquiryIdSchema,
  queryInquirySchema,
  updateInquirySchema,
  updateInquiryStatusSchema
} from '@/schemas/inquiry.schema';

const router = express.Router();

// Public route for creating inquiries (contact form submissions)
router.post('/', validate(createInquirySchema), createInquiry);

// Protected routes
router.use(protect(true));

// Routes that require 'inquiries:read' permission
router.get('/', requirePermission('inquiries:read'), validate(queryInquirySchema), getInquiries);
router.get('/:id', requirePermission('inquiries:read'), validate(inquiryIdSchema), getInquiry);

// Routes that require 'inquiries:update' permission
router.put('/:id', requirePermission('inquiries:update'), validate(updateInquirySchema), updateInquiry);
router.patch('/:id/status', requirePermission('inquiries:update'), validate(updateInquiryStatusSchema), updateInquiryStatus);

// Routes that require 'inquiries:assign' permission
router.patch('/:id/assign', requirePermission('inquiries:assign'), validate(assignInquirySchema), assignInquiry);

// Routes that require 'inquiries:delete' permission
router.delete('/:id', requirePermission('inquiries:delete'), validate(inquiryIdSchema), deleteInquiry);

export default router;