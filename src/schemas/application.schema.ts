import { z } from 'zod';

// Application status enum
export const ApplicationStatusEnum = z.enum([
    'pending',
    'reviewed',
    'shortlisted',
    'rejected',
    'hired'
]);

export type ApplicationStatus = z.infer<typeof ApplicationStatusEnum>;

// Base schema for application fields
const applicationBaseSchema = {
    career: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid career ID'),
    name: z.string().min(1, 'Name is required').trim(),
    email: z.string().email('Please provide a valid email').trim(),
    phone: z.string().min(1, 'Phone number is required').trim(),
    resumeUrl: z.string().min(1, 'Resume URL is required'),
    coverLetter: z.string().optional(),
    status: ApplicationStatusEnum.optional(),
    notes: z.string().optional()
};

// Submit application schema
export const submitApplicationSchema = z.object({
    body: z.object({
        ...applicationBaseSchema,
    })
});

// Update application schema
export const updateApplicationSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid application ID')
    }),
    body: z.object({
        ...Object.entries(applicationBaseSchema).reduce((acc, [key, schema]) => {
            acc[key] = schema.optional();
            return acc;
        }, {} as Record<string, any>)
    })
});

// Update application status schema
export const updateApplicationStatusSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid application ID')
    }),
    body: z.object({
        status: ApplicationStatusEnum,
        notes: z.string().optional()
    })
});

// Get application by ID schema
export const getApplicationSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid application ID')
    })
});

// Get applications by career ID schema
export const getApplicationsByCareerSchema = z.object({
    params: z.object({
        careerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid career ID')
    })
});

// Delete application schema
export const deleteApplicationSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid application ID')
    })
});

// Query schema for filtering applications
export const queryApplicationSchema = z.object({
    query: z.object({
        career: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid career ID').optional(),
        status: ApplicationStatusEnum.optional(),
        search: z.string().optional(),
        page: z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: z.string().regex(/^\d+$/).transform(Number).optional(),
        sort: z.string().optional(),
        fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
        toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional()
    })
});

// Schema Types
export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>['body'];
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>['body'];
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>['body'];
export type ApplicationIdParam = z.infer<typeof getApplicationSchema>['params'];
export type CareerIdParam = z.infer<typeof getApplicationsByCareerSchema>['params'];
export type DeleteApplicationParam = z.infer<typeof deleteApplicationSchema>['params'];
export type ApplicationQueryParams = z.infer<typeof queryApplicationSchema>['query'];
