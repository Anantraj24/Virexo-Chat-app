import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { searchLimiter } from '../middleware/rateLimiter.js';
import { searchMessages, searchUsers, searchConversations } from '../controllers/searchController.js';

const router = express.Router();

// Apply authentication to all search routes
router.use(authenticate);
router.use(searchLimiter);

// Global & scoped search endpoints
router.get('/messages', searchMessages);
router.get('/users', searchUsers);
router.get('/conversations', searchConversations);

export default router;
