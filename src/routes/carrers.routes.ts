import express from 'express';
import {
    createCareer,
    deleteCareer,
    getCareerById,
    getCareerBySlug,
    getCareers,
    getCareersByDepartment,
    getCareerStats,
    getDepartments,
    updateCareer,
    updateCareerStatus
} from '@/controllers/career.controller';
import { protect } from '@/middleware/auth.middleware';
import { requirePermission } from '@/middleware/permission.middlware';
import { validate } from '@/middleware/validate.middleware';
import {
    createCareerSchema,
    deleteCareerSchema,
    getCareerSchema,
    queryCareerSchema,
    updateCareerSchema
} from '@/schemas/career.schema';

const router = express.Router();

// Public routes with optional authentication
router.get('/', protect(false), validate(queryCareerSchema), getCareers);
router.get('/departments', getDepartments);
router.get('/slug/:slug', getCareerBySlug);
router.get('/department/:department', getCareersByDepartment);
router.get('/:id', validate(getCareerSchema), getCareerById);

// Protected routes
router.use(protect(true));

// Career management routes - require specific permissions
router.post('/', 
  requirePermission('careers:create'), 
  validate(createCareerSchema), 
  createCareer
);

router.put('/:id', 
  requirePermission('careers:update'), 
  validate(updateCareerSchema), 
  updateCareer
);

router.delete('/:id', 
  requirePermission('careers:delete'), 
  validate(deleteCareerSchema), 
  deleteCareer
);

router.patch('/:id/status', 
  requirePermission('careers:update', 'careers:publish'), 
  updateCareerStatus
);

// Stats route - fixed from careers:view to careers:read
router.get('/admin/stats', 
  requirePermission('careers:manage'), 
  getCareerStats
);

export default router;