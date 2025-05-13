import { Inquiry, User } from '@/models';
import {
  AssignInquiryBody,
  CreateInquiryBody,
  InquiryIdParams,
  InquiryQueryParams,
  UpdateInquiryBody,
  UpdateInquiryStatusBody
} from '@/schemas/inquiry.schema';
import { notifyRoles } from '@/socket';
import { ApiError } from '@/types';
import { mongoUtils } from '@/utils/common';
import { sendInquiryNotification } from '@/utils/email';
import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';

/**
 * @desc    Get all inquiries with filtering and pagination
 * @route   GET /api/inquiries
 * @access  Private (Admin, Business Developer)
 */
export const getInquiries = async (
  req: Request<{}, {}, {}, InquiryQueryParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      name,
      email,
      status,
      startDate,
      endDate,
      assignedTo,
      search,
      page = 1,
      limit = 10,
      sort = '-createdAt'
    } = req.query;
    console.log(status, "status")

    // Build match stage
    const matchStage: Record<string, any> = {};

    // Add text filters with regex
    if (name) matchStage.name = { $regex: name, $options: 'i' };
    if (email) matchStage.email = { $regex: email, $options: 'i' };

    if (status) {
      // Process array of categories
      if (Array.isArray(status) && status.length > 0) {
        matchStage.status = { $in: status };
      } else if (typeof status === 'string') {
        // Handle single category as string or comma-separated values
        const statusArray = (status as string).split(',').map(c => c.trim()).filter(Boolean);
        if (statusArray.length > 0) {
          matchStage.status = { $in: statusArray };
        }
      }
    }

    // Process date range filter
    if (startDate || endDate) {
      matchStage.createdAt = {};

      if (startDate) {
        matchStage.createdAt.$gte = new Date(startDate);
      }

      if (endDate) {
        // Add one day to include the end date fully
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        matchStage.createdAt.$lt = endDateObj;
      }
    }

    // Process assignedTo filter
    if (assignedTo) {
      matchStage.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }

    // Add search functionality
    if (search) {
      const searchQuery = mongoUtils.createSearchQuery(['name', 'email', 'message'], search);
      if (searchQuery) {
        Object.assign(matchStage, searchQuery);
      }
    }

    // Pagination calculations
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;
console.log(matchStage,"matchStage")
    // Build aggregation pipeline
    const aggregationPipeline: any[] = [];

    // Match stage
    aggregationPipeline.push({ $match: matchStage });

    // Lookup assigned user
    aggregationPipeline.push({
      $lookup: {
        from: 'users',
        localField: 'assignedTo',
        foreignField: '_id',
        as: 'assignedToUser'
      }
    });

    // Unwind assignedToUser (optional field)
    aggregationPipeline.push({
      $unwind: {
        path: '$assignedToUser',
        preserveNullAndEmptyArrays: true
      }
    });

    // Project fields
    aggregationPipeline.push({
      $project: {
        name: 1,
        email: 1,
        phone: 1,
        message: 1,
        status: 1,
        notes: 1,
        assignedTo: {
          $cond: {
            if: { $ifNull: ['$assignedToUser', false] },
            then: {
              _id: '$assignedToUser._id',
              name: '$assignedToUser.name',
              email: '$assignedToUser.email'
            },
            else: null
          }
        },
        createdAt: 1,
        updatedAt: 1
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
        inquiries: '$data',
        pagination: { $arrayElemAt: ['$metadata', 0] }
      }
    });

    const result = await Inquiry.aggregate(aggregationPipeline);
    const { inquiries, pagination } = result[0] || { inquiries: [], pagination: null };

    res.status(200).json({
      success: true,
      message: 'Inquiries retrieved successfully',
      data: {
        items: inquiries,
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
 * @desc    Get single inquiry by ID
 * @route   GET /api/inquiries/:id
 * @access  Private (Admin, Business Developer)
 */
export const getInquiry = async (
  req: Request<InquiryIdParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const inquiry = await Inquiry.findById(id).populate('assignedTo', 'name email');

    if (!inquiry) {
      const error = new Error('Inquiry not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Inquiry retrieved successfully',
      data: {
        inquiry
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new inquiry (from contact form)
 * @route   POST /api/inquiries
 * @access  Public
 */

// Modify the createInquiry function to emit socket event
export const createInquiry = async (
  req: Request<{}, {}, CreateInquiryBody>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { name, email, phone, message } = req.body

    // Create inquiry
    const inquiry = await Inquiry.create({
      name,
      email,
      phone,
      message,
    })

    // Send email notification
    await sendInquiryNotification(inquiry)

    // Send socket notification to relevant roles
    notifyRoles(["SuperAdmin", "Admin", "BusinessDeveloper"], "notification:inquiry", inquiry)

    res.status(201).json({
      success: true,
      message: "Inquiry submitted successfully",
      data: {
        inquiry,
      },
    })
  } catch (error) {
    next(error)
  }
}


/**
 * @desc    Update inquiry
 * @route   PUT /api/inquiries/:id
 * @access  Private (Admin, Business Developer)
 */
export const updateInquiry = async (
  req: Request<InquiryIdParams, {}, UpdateInquiryBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if inquiry exists
    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      const error = new Error('Inquiry not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    // If assignedTo is provided, verify user exists
    if (updateData.assignedTo) {
      const user = await User.findById(updateData.assignedTo);
      if (!user) {
        const error = new Error('Assigned user not found') as ApiError;
        error.statusCode = 400;
        throw error;
      }
    }

    // Update inquiry
    const updatedInquiry = await Inquiry.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email');

    res.status(200).json({
      success: true,
      message: 'Inquiry updated successfully',
      data: {
        inquiry: updatedInquiry
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update inquiry status
 * @route   PATCH /api/inquiries/:id/status
 * @access  Private (Admin, Business Developer)
 */
export const updateInquiryStatus = async (
  req: Request<InquiryIdParams, {}, UpdateInquiryStatusBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check if inquiry exists
    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      const error = new Error('Inquiry not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    // Update status
    // @ts-ignore
    inquiry.status = status;
    await inquiry.save();

    res.status(200).json({
      success: true,
      message: 'Inquiry status updated successfully',
      data: {
        inquiry
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Assign inquiry to a user
 * @route   PATCH /api/inquiries/:id/assign
 * @access  Private (Admin, Business Developer)
 */
export const assignInquiry = async (
  req: Request<InquiryIdParams, {}, AssignInquiryBody>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    // Check if inquiry exists
    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      const error = new Error('Inquiry not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    // Check if user exists
    const user = await User.findById(assignedTo);
    if (!user) {
      const error = new Error('User not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    // Update assignedTo
    // @ts-ignore
    inquiry.assignedTo = user._id;
    await inquiry.save();

    const updatedInquiry = await Inquiry.findById(id).populate('assignedTo', 'name email');

    res.status(200).json({
      success: true,
      message: 'Inquiry assigned successfully',
      data: {
        inquiry: updatedInquiry
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete inquiry
 * @route   DELETE /api/inquiries/:id
 * @access  Private (Admin)
 */
export const deleteInquiry = async (
  req: Request<InquiryIdParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if inquiry exists
    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      const error = new Error('Inquiry not found') as ApiError;
      error.statusCode = 404;
      throw error;
    }

    await inquiry.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Inquiry deleted successfully',
      data: {
        id
      }
    });
  } catch (error) {
    next(error);
  }
};
