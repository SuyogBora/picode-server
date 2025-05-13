import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
    email: z.string().email(),
    password: z.string().min(6).max(50),
    roleId: z.string().optional()
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6).max(50)
  })
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email()
  })
});

export const resetPasswordSchema = z.object({
  body: z.object({
    password: z.string().min(6).max(50)
  }),
  params: z.object({
    token: z.string()
  })
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(6).max(50),
    newPassword: z.string().min(6).max(50)
  })
});

// Role schemas
export const createRoleSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
    description: z.string().min(2),
    permissions: z.array(z.string()).optional(),
    isDefault: z.boolean().optional()
  })
});

export const updateRoleSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    description: z.string().min(2).optional(),
    permissions: z.array(z.string()).optional(),
    isDefault: z.boolean().optional()
  }),
  params: z.object({
    id: z.string()
  })
});

export const roleIdSchema = z.object({
  params: z.object({
    id: z.string()
  })
});

export const rolePermissionsSchema = z.object({
  body: z.object({
    permissions: z.array(z.string())
  }),
  params: z.object({
    id: z.string()
  })
});

// Permission schemas
export const createPermissionSchema = z.object({
  body: z.object({
    name: z.enum(['create', 'read', 'update', 'delete', 'manage', 'approve', 'publish']),
    resource: z.enum(['blogs', 'careers', 'applications', 'users', 'contacts', 'settings', 'roles', 'permissions', 'all']),
    description: z.string().min(2)
  })
});

export const updatePermissionSchema = z.object({
  body: z.object({
    name: z.enum(['create', 'read', 'update', 'delete', 'manage', 'approve', 'publish']).optional(),
    resource: z.enum(['blogs', 'careers', 'applications', 'users', 'contacts', 'settings', 'roles', 'permissions', 'all']).optional(),
    description: z.string().min(2).optional()
  }),
  params: z.object({
    id: z.string()
  })
});

export const permissionIdSchema = z.object({
  params: z.object({
    id: z.string()
  })
});

// User roles schemas
export const userIdSchema = z.object({
  params: z.object({
    id: z.string()
  })
});

export const userRolesSchema = z.object({
  body: z.object({
    roles: z.array(z.string())
  }),
  params: z.object({
    userId: z.string()
  })
});

// Authentication types
export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type ResetPasswordParams = z.infer<typeof resetPasswordSchema>['params'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];

// Role types
export type CreateRoleInput = z.infer<typeof createRoleSchema>['body'];
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>['body'];
export type RoleIdParam = z.infer<typeof roleIdSchema>['params'];
export type RolePermissionsInput = z.infer<typeof rolePermissionsSchema>['body'];

// Permission types
export type PermissionName = 'create' | 'read' | 'update' | 'delete' | 'manage' | 'approve' | 'publish';
export type ResourceName = 'blogs' | 'careers' | 'applications' | 'users' | 'contacts' | 'settings' | 'roles' | 'permissions' | 'all';

export type CreatePermissionInput = z.infer<typeof createPermissionSchema>['body'];
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>['body'];
export type PermissionIdParam = z.infer<typeof permissionIdSchema>['params'];

// User role types
export type UserIdParam = z.infer<typeof userIdSchema>['params'];
export type UserRolesInput = z.infer<typeof userRolesSchema>['body'];