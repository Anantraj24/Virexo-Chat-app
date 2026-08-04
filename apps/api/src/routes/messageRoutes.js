import express from 'express';
import {
  createMessage,
  getMessageHistory,
  markConversationRead,
  deleteMessage,
  editMessage,
  deleteMessageForEveryone,
  pinMessage,
  unpinMessage,
  addReaction,
  removeReaction,
  forwardMessage,
} from '../controllers/messageController.js';
import {
  createMessageRules,
  getMessageHistoryRules,
  deleteMessageRules,
  markReadRules,
  editMessageRules,
  deleteForEveryoneRules,
  pinMessageRules,
  unpinMessageRules,
  addReactionRules,
  removeReactionRules,
  forwardMessageRules,
} from '../middleware/messageValidators.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(authenticate);

router.post('/', authLimiter, createMessageRules, createMessage);

router.get('/conversation/:conversationId', getMessageHistoryRules, getMessageHistory);
router.post('/conversation/:conversationId/read', markReadRules, markConversationRead);

router.put('/:id', editMessageRules, editMessage);
router.delete('/:id', deleteMessageRules, deleteMessage);
router.delete('/:id/everyone', deleteForEveryoneRules, deleteMessageForEveryone);

router.post('/:id/pin', pinMessageRules, pinMessage);
router.delete('/:id/pin', unpinMessageRules, unpinMessage);

router.post('/:id/reactions', addReactionRules, addReaction);
router.delete('/:id/reactions', removeReactionRules, removeReaction);

router.post('/:id/forward', forwardMessageRules, forwardMessage);

export default router;