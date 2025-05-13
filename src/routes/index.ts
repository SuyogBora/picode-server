import { Router } from "express";
import applicationRoutes from "./application.routes";
import storageRoutes from "./storage.routes";
import authRoutes from "./auth.routes";
import blogsRoutes from "./blog.routes";
import careersRoutes from "./carrers.routes";
import permissionsRoutes from "./permission.routes";
import rolesRoutes from "./role.routes";
import usersRoutes from "./user.routes";
import inquiryRoutes from './inquiry.routes';
import settingsRoutes from './settings.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();
router.use("/auth", authRoutes);
router.use("/blogs", blogsRoutes);
router.use("/careers", careersRoutes);
router.use("/permissions", permissionsRoutes);
router.use("/roles", rolesRoutes);
router.use("/users", usersRoutes);
router.use("/applications", applicationRoutes);
router.use("/storage", storageRoutes);
router.use('/inquiries', inquiryRoutes);
router.use('/settings', settingsRoutes);
router.use('/dashboard', dashboardRoutes);

export default router
