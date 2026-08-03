import express from 'express';
import {
  createOrGetDirect,
  createGroup,
  listConversations,
  getConversationById,
  updateGroup,
  addMembers,
  removeMember,
  updateMemberRole,
  leaveGroup,
  transferOwnership,
} from '../controllers/conversationController.js';
import {
  createDirectRules,
  createGroupRules,
  updateGroupRules,
  addMembersRules,
  removeMemberRules,
  updateMemberRoleRules,
  transferOwnershipRules,
  listConversationsRules,
} from '../middleware/conversationValidators.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All conversation routes require authentication
router.use(authenticate);

// Direct & Group creation
router.post('/direct', createDirectRules, createOrGetDirect);
router.post('/group', createGroupRules, createGroup);

// List conversations with cursor pagination
router.get('/', listConversationsRules, listConversations);

// Conversation details & group management
router.get('/:id', getConversationById);
router.patch('/:id', updateGroupRules, updateGroup);

// Member management
router.post('/:id/members', addMembersRules, addMembers);
router.delete('/:id/members/:userId', removeMemberRules, removeMember);
router.patch('/:id/members/:userId/role', updateMemberRoleRules, updateMemberRole);

// Group lifecycle
router.post('/:id/leave', leaveGroup);
router.post('/:id/transfer-ownership', transferOwnershipRules, transferOwnership);

export default router;
