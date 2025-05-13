import express from 'express';
import {
    addPermissionsToRole,
    createRole,
    deleteRole,
    getRoleById,
    getRoles,
    removePermissionsFromRole,
    setRolePermissions,
    updateRole
} from '@/controllers/role.controller';
import { protect } from '@/middleware/auth.middleware';
import { requirePermission } from '@/middleware/permission.middlware';
import { validate } from '@/middleware/validate.middleware';
import { createRoleSchema, roleIdSchema, rolePermissionsSchema, updateRoleSchema } from '@/schemas/auth.schema';

const router = express.Router();

// Apply protection to all routes
router.use(protect(true));

// Role routes
router.route('/')
  .get(requirePermission('roles:read'), getRoles)
  .post(requirePermission('roles:create'), validate(createRoleSchema), createRole);

router.route('/:id')
  .get(requirePermission('roles:read'), validate(roleIdSchema), getRoleById)
  .put(requirePermission('roles:update'), validate(updateRoleSchema), updateRole)
  .delete(requirePermission('roles:delete'), validate(roleIdSchema), deleteRole);

// Role permissions routes
router.route('/:id/permissions')
  .post(requirePermission('roles:update'), validate(rolePermissionsSchema), addPermissionsToRole)
  .put(requirePermission('roles:update'), validate(rolePermissionsSchema), setRolePermissions)
  .delete(requirePermission('roles:update'), validate(rolePermissionsSchema), removePermissionsFromRole);

export default router;