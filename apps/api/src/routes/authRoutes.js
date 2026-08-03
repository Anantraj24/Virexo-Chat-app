import express from 'express';
import { signup, login, refresh, logout, logoutAll, getMe } from '../controllers/authController.js';
import { signupRules, loginRules } from '../middleware/validators.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', authLimiter, signupRules, signup);
router.post('/login', authLimiter, loginRules, login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);
router.post('/logout-all', authenticate, logoutAll);
router.get('/me', authenticate, getMe);

export default router;
