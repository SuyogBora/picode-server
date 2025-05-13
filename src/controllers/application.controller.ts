import Application from "@/models/application.model"
import Career from "@/models/career.model"
import type {
  ApplicationIdParam,
  ApplicationQueryParams,
  CareerIdParam,
  DeleteApplicationParam,
  SubmitApplicationInput,
  UpdateApplicationStatusInput,
} from "@/schemas/application.schema"
import { notifyRoles } from "@/socket"
import type { ApiError } from "@/types"
import type { NextFunction, Request, Response } from "express"

/**
 * @desc    Submit a job application
 * @route   POST /api/applications
 * @access  Public
 */
export const submitApplication = async (
  req: Request<{}, {}, SubmitApplicationInput>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { career: careerId, name, email, phone, resumeUrl, coverLetter } = req.body

    // Check if career exists and is published
    const career = await Career.findById(careerId)

    if (!career) {
      const error = new Error("Career not found") as ApiError
      error.statusCode = 404
      throw error
    }

    if (career.status !== "published") {
      const error = new Error("This job is not accepting applications") as ApiError
      error.statusCode = 400
      throw error
    }

    // Check if user already applied
    const existingApplication = await Application.findOne({
      career: careerId,
      email,
    })

    if (existingApplication) {
      const error = new Error("You have already applied for this position") as ApiError
      error.statusCode = 400
      throw error
    }

    // Create application
    const application = await Application.create({
      career: careerId,
      name,
      email,
      phone,
      resumeUrl,
      coverLetter,
    })

    // Populate career details for the notification
    const populatedApplication = await Application.findById(application._id).populate("career", "title department")

    // Send socket notification to relevant roles
    notifyRoles(["SuperAdmin", "Admin", "HRManager"], "notification:application", populatedApplication)

    res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: application,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Get all applications
 * @route   GET /api/applications
 * @access  Private/Admin
 */
export const getApplications = async (
  req: Request<{}, {}, {}, ApplicationQueryParams>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { career: careerId, status, search, page = 1, limit = 10, sort = "-createdAt", fromDate, toDate } = req.query

    // Build query
    const query: any = {}

    if (careerId) query.career = careerId
    if (status) query.status = status

    // Date range filtering
    if (fromDate || toDate) {
      query.createdAt = {}
      if (fromDate) query.createdAt.$gte = new Date(fromDate)
      if (toDate) query.createdAt.$lte = new Date(toDate)
    }

    // Search functionality
    if (search) {
      query.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }]
    }

    // Execute query with pagination
    const pageNum = Number(page)
    const limitNum = Number(limit)
    const skip = (pageNum - 1) * limitNum

    const applications = await Application.find(query)
      .populate("career", "title department")
      .sort(sort as string)
      .skip(skip)
      .limit(limitNum)

    // Get total count for pagination
    const total = await Application.countDocuments(query)

    res.status(200).json({
      success: true,
      message: "Applications retrieved successfully",
      data: {
        applications,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Get application by ID
 * @route   GET /api/applications/:id
 * @access  Private/Admin
 */
export const getApplicationById = async (
  req: Request<ApplicationIdParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const application = await Application.findById(req.params.id).populate("career")

    if (!application) {
      const error = new Error("Application not found") as ApiError
      error.statusCode = 404
      throw error
    }

    res.status(200).json({
      success: true,
      message: "Application retrieved successfully",
      data: application,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Update application status
 * @route   PATCH /api/applications/:id/status
 * @access  Private/Admin
 */
export const updateApplicationStatus = async (
  req: Request<ApplicationIdParam, {}, UpdateApplicationStatusInput>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { status, notes } = req.body

    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status, ...(notes && { notes }) },
      { new: true },
    )

    if (!application) {
      const error = new Error("Application not found") as ApiError
      error.statusCode = 404
      throw error
    }

    res.status(200).json({
      success: true,
      message: "Application status updated successfully",
      data: application,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Delete application
 * @route   DELETE /api/applications/:id
 * @access  Private/Admin
 */
export const deleteApplication = async (
  req: Request<DeleteApplicationParam>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const application = await Application.findById(req.params.id)

    if (!application) {
      const error = new Error("Application not found") as ApiError
      error.statusCode = 404
      throw error
    }

    await application.deleteOne()

    res.status(200).json({
      success: true,
      message: "Application deleted successfully",
      data: {},
    })
  } catch (error) {
    next(error)
  }
}

/**
 * @desc    Get applications by career
 * @route   GET /api/applications/career/:careerId
 * @access  Private/Admin
 */
export const getApplicationsByCareer = async (
  req: Request<CareerIdParam, {}, {}, { status?: string; page?: string; limit?: string,search?:string}>,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { careerId } = req.params
    const { status, page = 1, limit = 10 ,search} = req.query

    // Check if career exists
    const career = await Career.findById(careerId)

    if (!career) {
      const error = new Error("Career not found") as ApiError
      error.statusCode = 404
      throw error
    }

    // Build query
    const query: any = { career: careerId }

    if (status) query.status = status

      // Search functionality
    if (search) {
      query.$or = [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }]
    }

    // Execute query with pagination
    const pageNum = Number(page)
    const limitNum = Number(limit)
    const skip = (pageNum - 1) * limitNum

    const applications = await Application.find(query).sort("-createdAt").skip(skip).limit(limitNum)

    // Get total count for pagination
    const total = await Application.countDocuments(query)

    res.status(200).json({
      success: true,
      message: "Applications retrieved successfully",
      data: {
        items:applications,
        career,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    })
  } catch (error) {
    next(error)
  }
}
