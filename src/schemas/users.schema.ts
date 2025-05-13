import { z } from "zod";

// Define query schema for filtering users
export const queryUserSchema = z.object({
    query: z.object({
        name: z.string().optional(),
        email: z.string().optional(),
        role: z.union([
            z.string().transform(val => val.split(',')),
            z.array(z.string())
        ]).optional(),
        isActive: z.string().transform(val => val === 'true').optional(),
        isEmailVerified: z.string().transform(val => val === 'true').optional(),
        search: z.string().optional(),
        page: z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: z.string().regex(/^\d+$/).transform(Number).optional(),
        sort: z.string().optional()
    })
})

// Schema for user ID validation
export const userIdSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID')
    })
});

// Schema for user roles operations
export const userRolesSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID')
    }),
    body: z.object({
        roles: z.array(
            z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid role ID')
        ).min(1, 'At least one role is required')
    })
});

// Schema for creating a user
export const createUserSchema = z.object({
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Please enter a valid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        roles: z.array(
            z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid role ID')
        ).optional(),
        isActive: z.boolean().default(true),
        isEmailVerified: z.boolean().default(false)
    })
});

// Schema for updating a user
export const updateUserSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID')
    }),
    body: z.object({
        name: z.string().min(2, "Name must be at least 2 characters").optional(),
        email: z.string().email("Please enter a valid email address").optional(),
        password: z.string().min(6, "Password must be at least 6 characters").optional(),
        currentPassword: z.string().optional(),
        newPassword: z.string().min(6, "New password must be at least 6 characters").optional(),
        roles: z.array(
            z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid role ID')
        ).optional(),
        isActive: z.boolean().optional(),
        isEmailVerified: z.boolean().optional()
    }).refine(data => {
        // If newPassword is provided, currentPassword must also be provided
        if (data.newPassword && !data.currentPassword) {
            return false;
        }
        return true;
    }, {
        message: "Current password is required to set a new password",
        path: ["currentPassword"]
    })
});

// Type for user query parameters
export type UserQueryParams = z.infer<typeof queryUserSchema>['query'];

// Type for user ID params
export type UserIdParams = z.infer<typeof userIdSchema>['params'];

// Type for user roles body
export type UserRolesBody = z.infer<typeof userRolesSchema>['body'];

// Type for user roles params
export type UserRolesParams = z.infer<typeof userRolesSchema>['params'];

// Combined type for user roles request (params + body)
export interface UserRolesRequest {
    params: UserRolesParams;
    body: UserRolesBody;
}

// Type for create user body
export type CreateUserBody = z.infer<typeof createUserSchema>['body'];

// Type for update user body
export type UpdateUserBody = z.infer<typeof updateUserSchema>['body'];

// Type for update user params
export type UpdateUserParams = z.infer<typeof updateUserSchema>['params'];

// Combined type for update user request (params + body)
export interface UpdateUserRequest {
    params: UpdateUserParams;
    body: UpdateUserBody;
}

// Type for user response (excluding sensitive fields)
export type UserResponse = {
    _id: string;
    name: string;
    email: string;
    roles: Array<{
        _id: string;
        name: string;
        permissions?: Array<{
            _id: string;
            resource: string;
            name: string;
            description?: string;
        }>;
    }>;
    isActive: boolean;
    isEmailVerified: boolean;
    lastLoginAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
};

// Type for paginated users response
export type PaginatedUsersResponse = {
    users: UserResponse[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
};