import Career from '@/models/career.model';
import { CareerIdParam, CareerQueryParams, CareerSlugParam, CreateCareerInput, DepartmentParam, UpdateCareerInput, UpdateStatusInput } from '@/schemas/career.schema';
import { notifyRoles } from '@/socket';
import { ApiError } from '@/types';
import { getSortStage } from '@/utils/common';
import { NextFunction, Request, Response } from 'express';

/**
 * @desc    Create a new career
 * @route   POST /api/careers
 * @access  Private/Admin
 */
export const createCareer = async (
    req: Request<{}, {}, CreateCareerInput>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    console.log(req.body, "req.body")
    try {
        const career = await Career.create(req.body);
        // Send socket notification to relevant roles
        notifyRoles(["SuperAdmin", "Admin", "HRManager"], "notification:career", career)
        res.status(201).json({
            success: true,
            message: 'Career created successfully',
            data: career
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all careers with filtering, sorting, and pagination
 * @route   GET /api/careers
 * @access  Public
 */
export const getCareers = async (
    req: Request<{}, {}, {}, CareerQueryParams>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const {
            department,
            type,
            status,
            location,
            workMode,
            search,
            page = 1,
            limit = 10,
            sort = '-createdAt'
        } = req.query;

        // Build match stage
        const matchStage: any = {};

        // Add filters if provided
        if (department) matchStage.department = department;
        if (type) matchStage.type = type;
        if (location) matchStage.location = { $regex: location, $options: 'i' };
        if (workMode) matchStage.workMode = workMode;
        // Status filtering
        if (status) {
            if (status !== 'published' && (!req.user || !req.user.hasRole("SuperAdmin"))) {
                matchStage.status = 'published';
            } else {
                matchStage.status = status;
            }
        } else if (!req.user || !req.user.hasRole("SuperAdmin")) {
            matchStage.status = 'published';
        }

        // Search functionality
        if (search) {
            matchStage.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { department: { $regex: search, $options: 'i' } }
            ];
        }

        // Pagination calculations
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;
        const aggregationPipeline = [
            // Match documents based on query
            { $match: matchStage },

            // Facet for pagination metadata and results
            {
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
                        { $sort: getSortStage(sort as string) },
                        { $skip: skip },
                        { $limit: limitNum },
                        // Project only needed fields
                        {
                            $project: {
                                title: 1,
                                department: 1,
                                location: 1,
                                type: 1,
                                description: 1,
                                status: 1,
                                workMode: 1,
                                createdAt: 1,
                                publishedAt: 1,
                                closesAt: 1,
                                salary: 1,
                                experience: 1,
                                applicationsCount: 1
                            }
                        }
                    ]
                }
            },

            // Reshape the output
            {
                $project: {
                    careers: '$data',
                    pagination: { $arrayElemAt: ['$metadata', 0] }
                }
            }
        ];

        const result = await Career.aggregate(aggregationPipeline);
        const { careers, pagination } = result[0] || { careers: [], pagination: null };

        res.status(200).json({
            success: true,
            message: 'Careers retrieved successfully',
            data: {
                items: careers,
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
 * @desc    Get career by ID
 * @route   GET /api/careers/:id
 * @access  Public
 */
export const getCareerById = async (
    req: Request<CareerIdParam>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const career = await Career.findById(req.params.id);

        if (!career) {
            const error = new Error('Career not found') as ApiError;
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({
            success: true,
            message: 'Career retrieved successfully',
            data: career
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get career by slug
 * @route   GET /api/careers/slug/:slug
 * @access  Public
 */
export const getCareerBySlug = async (
    req: Request<CareerSlugParam>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const career = await Career.findOne({ slug: req.params.slug });

        if (!career) {
            const error = new Error('Career not found') as ApiError;
            error.statusCode = 404;
            throw error;
        }

        res.status(200).json({
            success: true,
            message: 'Career retrieved successfully',
            data: career
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update career
 * @route   PUT /api/careers/:id
 * @access  Private/Admin
 */
export const updateCareer = async (
    req: Request<CareerIdParam, {}, UpdateCareerInput>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        let career = await Career.findById(req.params.id);

        if (!career) {
            const error = new Error('Career not found') as ApiError;
            error.statusCode = 404;
            throw error;
        }

        // Check if status is changing to published
        if (req.body.status === 'published' && career.status !== 'published') {
            req.body.publishedAt = new Date();
        }

        career = await Career.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: 'Career updated successfully',
            data: career
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete career
 * @route   DELETE /api/careers/:id
 * @access  Private/Admin
 */
export const deleteCareer = async (
    req: Request<CareerIdParam>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const career = await Career.findById(req.params.id);

        if (!career) {
            const error = new Error('Career not found') as ApiError;
            error.statusCode = 404;
            throw error;
        }

        await career.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Career deleted successfully',
            data: {}
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get careers by department
 * @route   GET /api/careers/department/:department
 * @access  Public
 */
export const getCareersByDepartment = async (
    req: Request<DepartmentParam, {}, {}, { page?: string; limit?: string }>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { department } = req.params;
        const { page = 1, limit = 10 } = req.query;

        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;

        const query = {
            department,
            status: 'published'
        };

        const careers = await Career.find(query)
            .sort('-publishedAt')
            .skip(skip)
            .limit(limitNum);

        const total = await Career.countDocuments(query);

        res.status(200).json({
            success: true,
            message: 'Careers retrieved successfully',
            data: {
                careers,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    pages: Math.ceil(total / limitNum)
                }
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all departments with job counts
 * @route   GET /api/careers/departments
 * @access  Public
 */
export const getDepartments = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const departments = await Career.aggregate([
            { $match: { status: 'published' } },
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);

        res.status(200).json({
            success: true,
            message: 'Departments retrieved successfully',
            data: departments
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update career status
 * @route   PATCH /api/careers/:id/status
 * @access  Private/Admin
 */
export const updateCareerStatus = async (
    req: Request<CareerIdParam, {}, UpdateStatusInput>,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { status } = req.body;

        if (!['draft', 'published', 'closed'].includes(status)) {
            const error = new Error('Invalid status value') as ApiError;
            error.statusCode = 400;
            throw error;
        }

        let career = await Career.findById(req.params.id);

        if (!career) {
            const error = new Error('Career not found') as ApiError;
            error.statusCode = 404;
            throw error;
        }

        // Set publishedAt if status is changing to published
        let updateData: any = { status };
        if (status === 'published' && career.status !== 'published') {
            updateData.publishedAt = new Date();
        }

        career = await Career.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Career status updated successfully',
            data: career
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get career statistics
 * @route   GET /api/careers/stats
 * @access  Private/Admin
 */
export const getCareerStats = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const stats = await Career.aggregate([
            {
                $facet: {
                    statusStats: [
                        { $group: { _id: '$status', count: { $sum: 1 } } }
                    ],
                    departmentStats: [
                        { $group: { _id: '$department', count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ],
                    typeStats: [
                        { $group: { _id: '$type', count: { $sum: 1 } } }
                    ],
                    totalJobs: [
                        { $count: 'count' }
                    ],
                    recentJobs: [
                        { $sort: { createdAt: -1 } },
                        { $limit: 5 },
                        { $project: { title: 1, department: 1, createdAt: 1, status: 1 } }
                    ]
                }
            }
        ]);

        res.status(200).json({
            success: true,
            message: 'Career statistics retrieved successfully',
            data: stats[0]
        });
    } catch (error) {
        next(error);
    }
};