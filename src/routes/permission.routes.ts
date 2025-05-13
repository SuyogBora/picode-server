import express from 'express';
import {
    createPermission,
    deletePermission,
    getPermissionById,
    getPermissions,
    updatePermission
} from '@/controllers/permission.controller';
import { protect } from '@/middleware/auth.middleware';
import { requirePermission } from '@/middleware/permission.middlware';
import { validate } from '@/middleware/validate.middleware';
import { createPermissionSchema, permissionIdSchema, updatePermissionSchema } from '@/schemas/auth.schema';

const router = express.Router();

// Apply protection to all routes
router.use(protect(true));

router.route('/')
  .get(requirePermission('permissions:read'), getPermissions)
  .post(validate(createPermissionSchema), createPermission);

router.route('/:id')
  .get(requirePermission('permissions:read'), validate(permissionIdSchema), getPermissionById)
  .put(requirePermission('permissions:update'), validate(updatePermissionSchema), updatePermission)
  .delete(requirePermission('permissions:delete'), validate(permissionIdSchema), deletePermission);

export default router;