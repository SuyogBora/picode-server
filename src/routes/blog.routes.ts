import express from 'express';
import {
  createBlog,
  getBlogs,
  getBlogById,
  getBlogBySlug,
  updateBlog,
  deleteBlog,
  likeBlog,
  getFeaturedBlogs,
  getRelatedBlogs,
  getBlogStats
} from '@/controllers/blogs.controller';
import { validate } from '@/middleware/validate.middleware';
import { 
  createBlogSchema, 
  updateBlogSchema, 
  getBlogSchema, 
  getBlogBySlugSchema,
  deleteBlogSchema,
  queryBlogSchema
} from '@/schemas/blog.schema';
import { protect } from '@/middleware/auth.middleware';
import { requirePermission } from '@/middleware/permission.middlware';

const router = express.Router();

// Public routes with optional authentication
router.get('/', protect(false), validate(queryBlogSchema), getBlogs);
router.get('/featured', getFeaturedBlogs);
router.get('/slug/:slug', validate(getBlogBySlugSchema), getBlogBySlug);
router.get('/:id', validate(getBlogSchema), getBlogById);
router.get('/:id/related', validate(getBlogSchema), getRelatedBlogs);

// Protected routes - require authentication
router.use(protect(true));

// Blog management routes
router.post('/', 
  requirePermission('blogs:create'), 
  validate(createBlogSchema), 
  createBlog
);

router.put('/:id', 
  requirePermission('blogs:update'), 
  validate(updateBlogSchema), 
  updateBlog
);

router.delete('/:id', 
  requirePermission('blogs:delete'), 
  validate(deleteBlogSchema), 
  deleteBlog
);

// Like functionality - allow any authenticated user
router.put('/:id/like', likeBlog);

// Admin routes - fixed from blogs:view to blogs:read
router.get('/admin/stats', 
  requirePermission('blogs:read', 'blogs:manage'), 
  getBlogStats
);

export default router;