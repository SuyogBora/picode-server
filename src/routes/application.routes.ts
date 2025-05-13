import {
    deleteApplication,
    getApplicationById,
    getApplications,
    getApplicationsByCareer,
    submitApplication,
    updateApplicationStatus
} from '@/controllers/application.controller';
import { protect } from '@/middleware/auth.middleware';
import { requirePermission } from '@/middleware/permission.middlware';
import { validate } from '@/middleware/validate.middleware';
import {
    deleteApplicationSchema,
    getApplicationSchema,
    getApplicationsByCareerSchema,
    queryApplicationSchema,
    submitApplicationSchema,
    updateApplicationStatusSchema
} from '@/schemas/application.schema';
import express from 'express';

const router = express.Router();

// Public routes
router.post('/', validate(submitApplicationSchema), submitApplication);

// Protected routes - Admin only
router.use(protect(true));

// Application management routes - require specific permissions
router.get('/', 
  requirePermission('applications:view'), 
  validate(queryApplicationSchema),
  getApplications
);

router.get('/career/:careerId', 
  requirePermission('applications:view'), 
  validate(getApplicationsByCareerSchema), 
  getApplicationsByCareer
);

router.get('/:id', 
  requirePermission('applications:view'), 
  validate(getApplicationSchema), 
  getApplicationById
);

router.patch('/:id/status', 
  requirePermission('applications:update'), 
  validate(updateApplicationStatusSchema), 
  updateApplicationStatus
);

router.delete('/:id', 
  requirePermission('applications:delete'), 
  validate(deleteApplicationSchema), 
  deleteApplication
);

export default router;