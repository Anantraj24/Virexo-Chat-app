import express from 'express';
import {
  getProfile,
  updateProfile,
  updatePrivacy,
  updateNotifications,
  checkUsername,
  searchUsers,
  getUserById,
} from '../controllers/userController.js';
import {
  updateProfileRules,
  updatePrivacyRules,
  updateNotificationRules,
  checkUsernameRules,
  searchUsersRules,
} from '../middleware/userValidators.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Profile endpoints
router.get('/profile', getProfile);
router.patch('/profile', updateProfileRules, updateProfile);
router.patch('/privacy', updatePrivacyRules, updatePrivacy);
router.patch('/notifications', updateNotificationRules, updateNotifications);

// Search & check endpoints (rate limited)
router.get('/check-username', authLimiter, checkUsernameRules, checkUsername);
router.get('/search', authLimiter, searchUsersRules, searchUsers);

// Public profile lookup by ID or username
router.get('/:id', getUserById);

export default router;
