import {
    getActivityMetrics,
    getApplicationMetrics,
    getBlogMetrics,
    getCareerMetrics,
    getDashboardOverview,
    getInquiryMetrics,
} from "@/controllers/dashboard.controller"
import { protect } from "@/middleware/auth.middleware"
import { requirePermission } from "@/middleware/permission.middlware"
import express from "express"

const router = express.Router()

// All dashboard routes require authentication
router.use(protect(true))

// Dashboard overview route
router.get("/overview", requirePermission("dashboard:view"), getDashboardOverview)

// Module-specific metrics routes
router.get("/careers", requirePermission("dashboard:view", "careers:read"), getCareerMetrics)

router.get("/blogs", requirePermission("dashboard:view", "blogs:read"), getBlogMetrics)

router.get("/inquiries", requirePermission("dashboard:view", "inquiries:read"), getInquiryMetrics)

router.get("/applications", requirePermission("dashboard:view", "applications:view"), getApplicationMetrics)

// Activity metrics route
router.get("/activity", requirePermission("dashboard:view"), getActivityMetrics)

export default router
