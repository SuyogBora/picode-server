import {
    changePassword,
    forgotPassword,
    getMe,
    login,
    logout,
    refreshToken,
    register,
    resetPassword,
    verifyEmail
} from '@/controllers/auth.controller';
import { protect } from '@/middleware/auth.middleware';
import { validate } from '@/middleware/validate.middleware';
import {
    changePasswordSchema,
    forgotPasswordSchema,
    loginSchema,
    registerSchema,
    resetPasswordSchema
} from '@/schemas/auth.schema';
import express from 'express';

const router = express.Router();

// Public routes
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:token', validate(resetPasswordSchema), resetPassword);
router.get('/verify-email/:token', verifyEmail);

// Protected routes
router.use(protect(true));
router.get('/me', getMe);
router.post('/logout', logout);
router.put('/change-password', validate(changePasswordSchema), changePassword);

export default router;