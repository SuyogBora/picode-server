import {
  assignRolesToUser,
  createUser,
  deleteUser,
  getUser,
  getUserRoles,
  getUsers,
  removeRolesFromUser,
  setUserRoles,
  updateUser
} from '@/controllers/user.controller';
import { protect } from '@/middleware/auth.middleware';
import { requirePermission } from '@/middleware/permission.middlware';
import { validate } from '@/middleware/validate.middleware';
import { userIdSchema, userRolesSchema } from '@/schemas/auth.schema';
import { queryUserSchema } from '@/schemas/users.schema';
import express from 'express';

const router = express.Router();

// Apply protection to all routes
router.use(protect(true));

router.route('/')
  .get(requirePermission('users:read'), validate(queryUserSchema), getUsers)
  .post(requirePermission('users:create'), createUser);

// Single user routes
router.route('/:id')
  .get(requirePermission('users:read'), validate(userIdSchema), getUser)
  .put(requirePermission('users:update'), validate(userIdSchema), updateUser)
  .delete(requirePermission('users:delete'), validate(userIdSchema), deleteUser);

// User roles routes
router.route('/:id/roles')
  .get(requirePermission('users:read', 'roles:read'), validate(userIdSchema), getUserRoles)
  .post(requirePermission('users:update', 'roles:read'), validate(userRolesSchema), assignRolesToUser)
  .put(requirePermission('users:update', 'roles:read'), validate(userRolesSchema), setUserRoles)
  .delete(requirePermission('users:update', 'roles:read'), validate(userRolesSchema), removeRolesFromUser);

export default router;