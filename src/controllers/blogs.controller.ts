import Blog from '@/models/blog.model';
import { BlogIdParam, BlogQueryParams, BlogSlugParam, BlogStatusEnum, CreateBlogInput, UpdateBlogInput } from '@/schemas/blog.schema';
import { notifyRoles } from '@/socket';
import { ApiError } from '@/types';
import { mongoUtils } from '@/utils/common';
import { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';

// Update the Request interface in your types file to correctly type the user property
// This is what should be in your types.ts file:
/*
export interface Request extends Request {
  user?: IUser;
}
*/

/**
 * @desc    Create a new blog
 * @route   POST /api/blogs
 * @access  Private
 */
export const createBlog = async (
  req: Request<{}, {}, CreateBlogInput>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.body.seo) {
      req.body.seo = {
        metaTitle: req.body.title,
        metaDescription: req.body.excerpt,
        keywords: req.body.tags || [],
      }
    }

    const blog = await Blog.create({ ...req.body, author: req?.user?._id })

    // Populate author details for the notification
    const populatedBlog = await Blog.findById(blog._id).populate("author", "name")

    // Send socket notification to relevant roles
    notifyRoles(["SuperAdmin", "Admin", "ContentManager"], "notification:blog", populatedBlog)

    res.status(201).json({
      success: true,
      message: "Blog created successfully",
      data: blog,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Get all blogs with filtering, sorting, and pagination
 * @route   GET /api/blogs
 * @access  Public
 */
export const getBlogs = async (
    req: Request<{}, {}, {}, BlogQueryParams>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const {
            category,
            categories, // Add support for "categories" parameter
            tag,
            tags,      // Add support for "tags" parameter
            author,
            status,
            isFeatured,
            search,
            page = 1,
            limit = 10,
            sort = '-createdAt'
        } = req.query;

        // Build match stage
        const matchStage: Record<string, any> = {};

        // Handle category filtering with support for both "category" and "categories" params
        const categoryValues = categories || category;
        if (categoryValues) {
            // Process array of categories
            if (Array.isArray(categoryValues) && categoryValues.length > 0) {
                // Match any of the categories (using $in operator)
                matchStage.categories = { $in: categoryValues };
            } else if (typeof categoryValues === 'string') {
                // Handle single category as string or comma-separated values
                const categoryArray = (categoryValues as string).split(',').map(c => c.trim()).filter(Boolean);
                if (categoryArray.length > 0) {
                    matchStage.categories = { $in: categoryArray };
                }
            }
        }

        // Handle tag filtering with support for both "tag" and "tags" params
        const tagValues = tags || tag;
        if (tagValues) {
            // Process array of tags
            if (Array.isArray(tagValues) && tagValues.length > 0) {
                // Match any of the tags (using $in operator)
                matchStage.tags = { $in: tagValues };
            } else if (typeof tagValues === 'string') {
                // Handle single tag as string or comma-separated values
                const tagArray = (tagValues as string).split(',').map(t => t.trim()).filter(Boolean);
                if (tagArray.length > 0) {
                    matchStage.tags = { $in: tagArray };
                }
            }
        }

        // Rest of the function remains the same...
        // Handle author filtering
        if (author) {
            const authorId = mongoUtils.parseIds(author);
            if (authorId) {
                matchStage.author = authorId[0];
            }
        }

        // Handle status filtering
          if (status && Object.values(BlogStatusEnum.enum).includes(status as any)) {
            if (status !== BlogStatusEnum.enum.published && (!req.user || !req.user.hasRole("SuperAdmin"))) {
                matchStage.status = BlogStatusEnum.enum.published;
            } else {
                matchStage.status = status;
            }
        } else if (!req.user || !req.user.hasRole("SuperAdmin")) {
            matchStage.status = BlogStatusEnum.enum.published;
        }

        // Handle featured filtering
        const parsedFeatured = mongoUtils.parseBoolean(isFeatured);
        if (parsedFeatured !== undefined) {
            matchStage.isFeatured = parsedFeatured;
        }

        // Add search functionality
        if (search) {
            const searchQuery = mongoUtils.createSearchQuery(
                ['title', 'excerpt', 'content'],
                search
            );
            if (searchQuery) {
                Object.assign(matchStage, searchQuery);
            }
        }

        // Pagination calculations
        const pageNum = Number(page) || 1;
        const limitNum = Number(limit) || 10;
        const skip = (pageNum - 1) * limitNum;

        // Build aggregation pipeline
        const aggregationPipeline: any[] = [];

        // Match stage
        aggregationPipeline.push({ $match: matchStage });

        // Lookup author
        aggregationPipeline.push({
            $lookup: {
                from: 'users',
                localField: 'author',
                foreignField: '_id',
                as: 'author'
            }
        });

        // Unwind author (convert from array to object)
        aggregationPipeline.push({
            $unwind: {
                path: '$author',
                preserveNullAndEmptyArrays: true
            }
        });

        // Project fields
        aggregationPipeline.push({
            $project: {
                title: 1,
                slug: 1,
                excerpt: 1,
                content: 1,
                contentType: 1,
                categories: 1,
                tags: 1,
                featuredImage: 1,
                readingTime: 1,
                status: 1,
                publishedAt: 1,
                isFeatured: 1,
                views: 1,
                likes: 1,
                seo: 1,
                createdAt: 1,
                updatedAt: 1,
                author: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    avatar: 1
                }
            }
        });

        // Add sorting
        if (sort) {
            const sortStage: Record<string, number> = {};
            const sortFields = sort.split(',');

            sortFields.forEach(field => {
                const sortOrder = field.startsWith('-') ? -1 : 1;
                const fieldName = field.replace(/^-/, '');
                sortStage[fieldName] = sortOrder;
            });

            aggregationPipeline.push({ $sort: sortStage });
        }

        // Facet for pagination and results
        aggregationPipeline.push({
            $facet: {
                metadata: [
                    { $count: 'total' },
                    {
                        $addFields: {
                            page: pageNum,
                            limit: limitNum,
                            pages: { $ceil: { $divide: ['$total', limitNum] } }
                        }
                    }
                ],
                data: [
                    { $skip: skip },
                    { $limit: limitNum }
                ]
            }
        });

        // Reshape output
        aggregationPipeline.push({
            $project: {
                blogs: '$data',
                pagination: { $arrayElemAt: ['$metadata', 0] }
            }
        });

        const result = await Blog.aggregate(aggregationPipeline);
        const { blogs, pagination } = result[0] || { blogs: [], pagination: null };

        res.status(200).json({
            success: true,
            message: 'Blogs retrieved successfully',
            data: {
                items: blogs,
                pagination: pagination || {
                    page: pageNum,
                    limit: limitNum,
                    total: 0,
                    pages: 0
                }
            }
        });
    } catch (error) {
        next(error);
    }
};
/**
 * @desc    Get blog by ID
 * @route   GET /api/blogs/:id
 * @access  Public
 */
export const getBlogById = async (
    req: Request<BlogIdParam>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const blog = await Blog.findById(req.params.id)
            .populate('author', 'name avatar bio')
            .populate('relatedPosts', 'title slug featuredImage publishedAt');

        if (!blog) {
            const error = new Error('Blog not found') as ApiError;
            error.statusCode = 404;
            throw error;
        }

        const isPopulatedAuthor = typeof blog.author !== 'string' &&
            blog.author !== null &&
            typeof blog.author === 'object' &&
            '_id' in blog.author;

        if (blog.status !== 'published') {
            if (!req.user) {
                const error = new Error('Blog not found') as ApiError;
                error.statusCode = 404;
                throw error;
            }

            const authorId = isPopulatedAuthor ? (blog.author._id as Types.ObjectId).toString() : blog.author.toString();
            const userId = (req.user._id as Types.ObjectId).toString();

            if (userId !== authorId && !req.user.hasRole("SuperAdmin")) {
                const error = new Error('Blog not found') as ApiError;
                error.statusCode = 404;
                throw error;
            }
        }

        await Blog.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

        res.status(200).json({
            success: true,
            message: 'Blog retrieved successfully',
            data: blog
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get blog by slug
 * @route   GET /api/blogs/slug/:slug
 * @access  Public
 */
export const getBlogBySlug = async (
    req: Request<BlogSlugParam>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const blog = await Blog.findOne({ slug: req.params.slug })
            .populate('author', 'name avatar bio')
            .populate('relatedPosts', 'title slug featuredImage publishedAt');

        if (!blog) {
            const error = new Error('Blog not found') as ApiError;
            error.statusCode = 404;
            throw error;
        }

        const isPopulatedAuthor = typeof blog.author !== 'string' &&
            blog.author !== null &&
            typeof blog.author === 'object' &&
            '_id' in blog.author;

        if (blog.status !== 'published') {
            if (!req.user) {
                const error = new Error('Blog not found') as ApiError;
                error.statusCode = 404;
                throw error;
            }

            const authorId = isPopulatedAuthor ? (blog.author._id as Types.ObjectId).toString() : blog.author.toString();
            const userId = (req.user._id as Types.ObjectId).toString();

            if (userId !== authorId && !req.user.hasRole("SuperAdmin")) {
                const error = new Error('Blog not found') as ApiError;
                error.statusCode = 404;
                throw error;
            }
        }

        await Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } });

        res.status(200).json({
            success: true,
            message: 'Blog retrieved successfully',
            data: blog
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update blog
 * @route   PUT /api/blogs/:id
 * @access  Private
 */
export const updateBlog = async (
    req: Request<BlogIdParam, {}, UpdateBlogInput>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        let blog = await Blog.findById(req.params.id);

        if (!blog) {
            const error = new Error('Blog not found') as ApiError;
            error.statusCode = 404;
            throw error;
        }

        if (!req.user) {
            const error = new Error('User not authenticated') as ApiError;
            error.statusCode = 401;
            throw error;
        }

        if (blog.author.toString() !== (req.user._id as Types.ObjectId).toString() && !req.user.hasRole("SuperAdmin")) {
            const error = new Error('Not authorized to update this blog') as ApiError;
            error.statusCode = 403;
            throw error;
        }

        if (req.body.status === 'published' && blog.status !== 'published') {
            req.body.publishedAt = new Date();
        }

        if ((req.body.title || req.body.excerpt) && !req.body.seo) {
            req.body.seo = {
                ...(blog.seo || {}),
                ...(req.body.title && { metaTitle: req.body.title }),
                ...(req.body.excerpt && { metaDescription: req.body.excerpt }),
                ...(req.body.tags && { keywords: req.body.tags })
            };
        }

        blog = await Blog.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Blog updated successfully',
            data: blog
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete blog
 * @route   DELETE /api/blogs/:id
 * @access  Private
 */
export const deleteBlog = async (
    req: Request<BlogIdParam>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            const error = new Error('Blog not found') as ApiError;
            error.statusCode = 404;
            throw error;
        }
        if (!req.user) {
            const error = new Error('User not authenticated') as ApiError;
            error.statusCode = 401;
            throw error;
        }

        if (blog.author.toString() !== (req?.user._id as Types.ObjectId).toString() && !req.user.hasRole("SuperAdmin")) {
            const error = new Error('Not authorized to delete this blog') as ApiError;
            error.statusCode = 403;
            throw error;
        }

        await blog.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Blog deleted successfully',
            data: {}
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Like/Unlike blog
 * @route   PUT /api/blogs/:id/like
 * @access  Private
 */
export const likeBlog = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;

        // Find blog and increment likes
        const blog = await Blog.findByIdAndUpdate(
            id,
            { $inc: { likes: 1 } },
            { new: true }
        );

        if (!blog) {
            res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Blog liked successfully',
            data: { likes: blog.likes }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get featured blogs
 * @route   GET /api/blogs/featured
 * @access  Public
 */
export const getFeaturedBlogs = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const blogs = await Blog.find({
            status: 'published',
            isFeatured: true
        })
            .populate('author', 'name avatar')
            .sort('-publishedAt')
            .limit(5);

        res.status(200).json({
            success: true,
            message: 'Featured blogs retrieved successfully',
            data: blogs
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get related blogs
 * @route   GET /api/blogs/:id/related
 * @access  Public
 */
export const getRelatedBlogs = async (
    req: Request<BlogIdParam>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const blog = await Blog.findById(req.params.id);

        if (!blog) {
            const error = new Error('Blog not found') as ApiError;
            error.statusCode = 404;
            throw error;
        }

        const relatedBlogs = await Blog.find({
            _id: { $ne: blog._id },
            status: 'published',
            $or: [
                { categories: { $in: blog.categories } },
                { tags: { $in: blog.tags } }
            ]
        })
            .populate('author', 'name avatar')
            .sort('-publishedAt')
            .limit(3);

        res.status(200).json({
            success: true,
            message: 'Related blogs retrieved successfully',
            data: relatedBlogs
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get blog statistics
 * @route   GET /api/blogs/stats
 * @access  Private/Admin
 */
export const getBlogStats = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Check if user is super admin
        if (!req.user || !req.user.hasRole("SuperAdmin")) {
            const error = new Error('Not authorized to access blog statistics') as ApiError;
            error.statusCode = 403;
            throw error;
        }

        const stats = await Blog.aggregate([
            {
                $facet: {
                    statusStats: [
                        { $group: { _id: '$status', count: { $sum: 1 } } }
                    ],
                    categoryStats: [
                        { $unwind: '$categories' },
                        { $group: { _id: '$categories', count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 5 }
                    ],
                    tagStats: [
                        { $unwind: '$tags' },
                        { $group: { _id: '$tags', count: { $sum: 1 } } },
                        { $sort: { count: -1 } },
                        { $limit: 10 }
                    ],
                    totalBlogs: [
                        { $count: 'count' }
                    ],
                    totalViews: [
                        { $group: { _id: null, total: { $sum: '$views' } } }
                    ],
                    totalLikes: [
                        { $group: { _id: null, total: { $sum: '$likes' } } }
                    ],
                    recentBlogs: [
                        { $sort: { createdAt: -1 } },
                        { $limit: 5 },
                        { $project: { title: 1, slug: 1, status: 1, createdAt: 1 } }
                    ],
                    popularBlogs: [
                        { $sort: { views: -1 } },
                        { $limit: 5 },
                        { $project: { title: 1, slug: 1, views: 1, likes: 1 } }
                    ]
                }
            }
        ]);

        res.status(200).json({
            success: true,
            message: 'Blog statistics retrieved successfully',
            data: stats[0]
        });
    } catch (error) {
        next(error);
    }
};

export const toggleFeatured = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;

        // Find blog
        const blog = await Blog.findById(id);

        if (!blog) {
            res.status(404).json({
                success: false,
                message: 'Blog not found'
            });
            return;
        }

        // Toggle featured status
        blog.isFeatured = !blog.isFeatured;
        await blog.save();

        res.status(200).json({
            success: true,
            message: `Blog ${blog.isFeatured ? 'marked as featured' : 'removed from featured'}`,
            data: blog
        });
    } catch (error) {
        next(error);
    }
};