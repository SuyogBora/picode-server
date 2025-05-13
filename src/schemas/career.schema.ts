import { z } from 'zod';

// Department enum based on the frontend design
export const DepartmentEnum = z.enum([
  'UI/UX Design',
  'Frontend Development',
  'Backend Development',
  'Software Testing',
  'Support Engineering',
  'Cloud Engineering',
  'Data Analysis',
  'Human Resources',
  'Graphics Design',
  'Other'
]);

// Employment type enum
export const EmploymentTypeEnum = z.enum([
  'full-time',
  'part-time',
  'contract',
  'internship'
]);

// Status enum
export const StatusEnum = z.enum([
  'draft',
  'published',
  'closed'
]);

export type Department = z.infer<typeof DepartmentEnum>;
export type EmploymentType = z.infer<typeof EmploymentTypeEnum>;
export type CareerStatus = z.infer<typeof StatusEnum>;

// Base schema for career fields
const careerBaseSchema = {
  title: z.string().min(1, 'Job title is required').max(100, 'Title cannot be more than 100 characters'),
  department: DepartmentEnum,
  location: z.string().min(1, 'Location is required'),
  type: EmploymentTypeEnum,
  description: z.string().min(1, 'Description is required'),
  // Removed requirements and responsibilities fields
  rolesAndResponsibilities: z.array(z.string()).min(1, 'At least one role or responsibility is required'),
  qualifications: z.array(z.string()).min(1, 'At least one qualification is required'),
  desiredSkills: z.array(z.string()).optional(),
  salary: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    currency: z.string().default('USD')
  }).optional(),
  applicationEmail: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  applicationUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  status: StatusEnum.default('draft'),
  closesAt: z.coerce.date().optional().nullable(),
  workMode: z.enum(['remote', 'onsite', 'hybrid']).default('onsite'),
  experience: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    unit: z.enum(['years', 'months']).default('years')
  }).optional(),
  skills: z.array(z.string()).optional(),
  shift: z.string().optional(),
};

// Create career schema
export const createCareerSchema = z.object({
  body: z.object({
    ...careerBaseSchema,
  })
});

// Update career schema
export const updateCareerSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid career ID')
  }),
  body: z.object({
    ...Object.entries(careerBaseSchema).reduce((acc, [key, schema]) => {
      acc[key] = schema.optional();
      return acc;
    }, {} as Record<string, any>)
  })
});

// Get career by ID schema
export const getCareerSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid career ID')
  })
});

// Delete career schema
export const deleteCareerSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid career ID')
  })
});

// Query schema for filtering careers
export const queryCareerSchema = z.object({
  query: z.object({
    department: DepartmentEnum.optional(),
    type: EmploymentTypeEnum.optional(),
    status: StatusEnum.optional(),
    location: z.string().optional(),
    workMode: z.enum(['remote', 'onsite', 'hybrid']).optional(),
    search: z.string().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    sort: z.string().optional()
  })
});

// Schema Types
export type CreateCareerInput = z.infer<typeof createCareerSchema>['body'];
export type UpdateCareerInput = z.infer<typeof updateCareerSchema>['body'];
export type CareerIdParam = z.infer<typeof getCareerSchema>['params'];
export type DeleteCareerParams = z.infer<typeof deleteCareerSchema>['params'];
export type CareerQueryParams = z.infer<typeof queryCareerSchema>['query'];
export type DepartmentParam = { department: Department };
export type CareerSlugParam = { slug: string };
export type UpdateStatusInput = { status: CareerStatus };
