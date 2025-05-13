import { z } from "zod";

export const InquiryStatusEnum = z.enum([
  'new',
  'in-process',
  'closed',
  'rejected',
  'completed'
]);
// Define query schema for filtering inquiries
export const queryInquirySchema = z.object({
  query: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    status: z.union([
      InquiryStatusEnum,
      z.array(InquiryStatusEnum),
      z.string().transform(val =>
        val.split(',').map(c => c.trim()).filter(Boolean)
      )
    ]).optional()
      .transform(val => {
        // Ensure result is always an array
        if (!val) return undefined;
        return Array.isArray(val) ? val : [val];
      }),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    assignedTo: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID').optional(),
    search: z.string().optional(),
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    sort: z.string().optional()
  })
});

// Schema for inquiry ID validation
export const inquiryIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid inquiry ID')
  })
});

// Schema for creating an inquiry
export const createInquirySchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    phone: z.string().optional(),
    message: z.string().min(10, "Message must be at least 10 characters"),
    status: InquiryStatusEnum.optional(),
    assignedTo: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID').optional(),
    notes: z.string().optional()
  })
});

// Schema for updating an inquiry
export const updateInquirySchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid inquiry ID')
  }),
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
    email: z.string().email("Please enter a valid email address").optional(),
    phone: z.string().optional(),
    message: z.string().min(10, "Message must be at least 10 characters").optional(),
    status: z.array(InquiryStatusEnum).optional(),
    assignedTo: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID').optional(),
    notes: z.string().optional()
  })
});

// Schema for updating inquiry status
export const updateInquiryStatusSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid inquiry ID')
  }),
  body: z.object({
    status: InquiryStatusEnum
  })
});

// Schema for assigning inquiry
export const assignInquirySchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid inquiry ID')
  }),
  body: z.object({
    assignedTo: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID')
  })
});

// Type for inquiry query parameters
export type InquiryQueryParams = z.infer<typeof queryInquirySchema>['query'];

// Type for inquiry ID params
export type InquiryIdParams = z.infer<typeof inquiryIdSchema>['params'];

// Type for create inquiry body
export type CreateInquiryBody = z.infer<typeof createInquirySchema>['body'];

// Type for update inquiry body
export type UpdateInquiryBody = z.infer<typeof updateInquirySchema>['body'];

// Type for update inquiry params
export type UpdateInquiryParams = z.infer<typeof updateInquirySchema>['params'];

// Type for update inquiry status body
export type UpdateInquiryStatusBody = z.infer<typeof updateInquiryStatusSchema>['body'];

// Type for assign inquiry body
export type AssignInquiryBody = z.infer<typeof assignInquirySchema>['body'];

// Combined type for update inquiry request (params + body)
export interface UpdateInquiryRequest {
  params: UpdateInquiryParams;
  body: UpdateInquiryBody;
}

// Combined type for update inquiry status request (params + body)
export interface UpdateInquiryStatusRequest {
  params: InquiryIdParams;
  body: UpdateInquiryStatusBody;
}

// Combined type for assign inquiry request (params + body)
export interface AssignInquiryRequest {
  params: InquiryIdParams;
  body: AssignInquiryBody;
}
