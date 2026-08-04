import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { searchLimiter } from '../middleware/rateLimiter.js';
import { searchMessages, searchUsers, searchConversations } from '../controllers/searchController.js';
import {
  searchMessagesRules,
  searchUsersRules,
  searchConversationsRules
} from '../middleware/searchValidators.js';

const router = express.Router();

// Apply authentication to all search routes
router.use(authenticate);
router.use(searchLimiter);

// Global & scoped search endpoints
router.get('/messages', searchMessagesRules, searchMessages);
router.get('/users', searchUsersRules, searchUsers);
router.get('/conversations', searchConversationsRules, searchConversations);

export default router;
