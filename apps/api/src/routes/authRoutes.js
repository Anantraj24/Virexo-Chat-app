import express from 'express';
import {
  signup,
  login,
  refresh,
  logout,
  logoutAll,
  getMe,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import {
  signupRules,
  loginRules,
  verifyEmailRules,
  forgotPasswordRules,
  resetPasswordRules,
} from '../middleware/validators.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', authLimiter, signupRules, signup);
router.post('/login', authLimiter, loginRules, login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);
router.post('/logout-all', authenticate, logoutAll);
router.get('/me', authenticate, getMe);

// Email verification & password recovery
router.post('/verify-email', authLimiter, verifyEmailRules, verifyEmail);
router.post('/resend-verification', authLimiter, authenticate, resendVerification);
router.post('/forgot-password', authLimiter, forgotPasswordRules, forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordRules, resetPassword);

export default router;
