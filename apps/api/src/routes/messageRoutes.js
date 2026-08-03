import express from 'express';
import {
  createMessage,
  getMessageHistory,
  markConversationRead,
  deleteMessage,
} from '../controllers/messageController.js';
import {
  createMessageRules,
  getMessageHistoryRules,
  deleteMessageRules,
  markReadRules,
} from '../middleware/messageValidators.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All message endpoints require authentication
router.use(authenticate);

// Create message (rate limited)
router.post('/', authLimiter, createMessageRules, createMessage);

// History & Read tracking
router.get('/conversation/:conversationId', getMessageHistoryRules, getMessageHistory);
router.post('/conversation/:conversationId/read', markReadRules, markConversationRead);

// Soft delete
router.delete('/:id', deleteMessageRules, deleteMessage);

export default router;
