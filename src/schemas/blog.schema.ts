import { z } from 'zod';

// Status enum
export const BlogStatusEnum = z.enum([
    'draft',
    'published',
    'archived'
]);

// Content type enum
export const ContentTypeEnum = z.enum([
    'markdown',
    'html',
    'json'
]);

export const BlogCategoryEnum = z.enum([
    'technology',
    'business',
    'health',
    'lifestyle',
    'travel',
    'food',
    'education',
    'entertainment',
    'finance',
    'other'
]);

export type BlogStatus = z.infer<typeof BlogStatusEnum>;
export type ContentType = z.infer<typeof ContentTypeEnum>;
export type BlogCategory = z.infer<typeof BlogCategoryEnum>;

// Base schema for blog fields
const blogBaseSchema = {
    title: z.string().min(1, 'Title is required').max(200, 'Title cannot be more than 200 characters'),
    content: z.string().min(1, 'Content is required'),
    contentType: ContentTypeEnum.optional(),
    excerpt: z.string().min(1, 'Excerpt is required').max(500, 'Excerpt cannot be more than 500 characters'),
    // Change this line to accept an array of categories
    categories: z.array(BlogCategoryEnum).optional(),
    tags: z.array(z.string()).optional(),
    featuredImage: z.string().optional(),
    status: BlogStatusEnum.optional(),
    isFeatured: z.boolean().optional(),
    seo: z.object({
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        keywords: z.array(z.string()).optional(),
        ogImage: z.string().optional()
    }).optional(),
    relatedPosts: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid blog ID')).optional()
};
// Create blog schema
export const createBlogSchema = z.object({
    body: z.object({
        ...blogBaseSchema,
    })
});

// Update blog schema
export const updateBlogSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid blog ID')
    }),
    body: z.object({
        ...Object.entries(blogBaseSchema).reduce((acc, [key, schema]) => {
            acc[key] = schema.optional();
            return acc;
        }, {} as Record<string, any>)
    })
});

// Get blog by ID schema
export const getBlogSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid blog ID')
    })
});

// Get blog by slug schema
export const getBlogBySlugSchema = z.object({
    params: z.object({
        slug: z.string()
    })
});

// Delete blog schema
export const deleteBlogSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid blog ID')
    })
});

// Query schema for filtering blogs
export const queryBlogSchema = z.object({
    query: z.object({
        // Support for both category and categories
        category: z.union([
            // Handle single category as string
            BlogCategoryEnum,
            // Handle array of categories
            z.array(BlogCategoryEnum),
            // Handle comma-separated string of categories
            z.string().transform(val =>
                val.split(',').map(c => c.trim()).filter(Boolean)
            )
        ]).optional()
            .transform(val => {
                // Ensure result is always an array
                if (!val) return undefined;
                return Array.isArray(val) ? val : [val];
            }),

        // Add support for 'categories' parameter
        categories: z.union([
            BlogCategoryEnum,
            z.array(BlogCategoryEnum),
            z.string().transform(val =>
                val.split(',').map(c => c.trim()).filter(Boolean)
            )
        ]).optional()
            .transform(val => {
                if (!val) return undefined;
                return Array.isArray(val) ? val : [val];
            }),

        // Original tag support
        tag: z.union([
            z.string(),
            z.array(z.string()),
            z.string().transform(val => val.split(',').map(t => t.trim()).filter(Boolean))
        ]).optional()
            .transform(val => {
                if (!val) return undefined;
                return Array.isArray(val) ? val : [val];
            }),

        // Add support for 'tags' parameter
        tags: z.union([
            z.string(),
            z.array(z.string()),
            z.string().transform(val => val.split(',').map(t => t.trim()).filter(Boolean))
        ]).optional()
            .transform(val => {
                if (!val) return undefined;
                return Array.isArray(val) ? val : [val];
            }),
        author: z.string().optional(),
        status: BlogStatusEnum.optional(),
        isFeatured:  z.string().transform(val => val === 'true').optional(),
        search: z.string().optional(),
        page: z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: z.string().regex(/^\d+$/).transform(Number).optional(),
        sort: z.string().optional()
    })
});

// Category schemas
export const createCategorySchema = z.object({
    body: z.object({
        name: z.string().min(1, 'Name is required').max(50, 'Name cannot be more than 50 characters'),
        description: z.string().max(500, 'Description cannot be more than 500 characters').optional(),
        parentCategory: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID').optional(),
        featuredImage: z.string().optional()
    })
});

export const updateCategorySchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID')
    }),
    body: z.object({
        name: z.string().min(1, 'Name is required').max(50, 'Name cannot be more than 50 characters').optional(),
        description: z.string().max(500, 'Description cannot be more than 500 characters').optional(),
        parentCategory: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID').optional(),
        featuredImage: z.string().optional()
    })
});

// Comment schemas
export const createCommentSchema = z.object({
    body: z.object({
        blog: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid blog ID'),
        content: z.string().min(1, 'Comment content is required'),
        parentComment: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid comment ID').optional()
    })
});

export const updateCommentSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid comment ID')
    }),
    body: z.object({
        content: z.string().min(1, 'Comment content is required').optional(),
        status: z.enum(['pending', 'approved', 'rejected']).optional()
    })
});


// Blog Schemas Types
export type CreateBlogInput = z.infer<typeof createBlogSchema>['body'];
export type UpdateBlogInput = z.infer<typeof updateBlogSchema>['body'];
export type BlogIdParam = z.infer<typeof getBlogSchema>['params'];
export type BlogSlugParam = z.infer<typeof getBlogBySlugSchema>['params'];
export type DeleteBlogParams = z.infer<typeof deleteBlogSchema>['params'];
export type BlogQueryParams = z.infer<typeof queryBlogSchema>['query'];

// Category Types
export type CreateCategoryInput = z.infer<typeof createCategorySchema>['body'];
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>['body'];
export type CategoryIdParam = z.infer<typeof updateCategorySchema>['params'];

// Comment Types
export type CreateCommentInput = z.infer<typeof createCommentSchema>['body'];
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>['body'];
export type CommentIdParam = z.infer<typeof updateCommentSchema>['params'];
