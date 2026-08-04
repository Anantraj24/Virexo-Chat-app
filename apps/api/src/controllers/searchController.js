import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { Conversation } from '../models/Conversation.js';
import { createApiResponse } from '@virexo/shared';
import { BadRequestError } from '../utils/errors.js';

// Helper to sanitize public user profile (same as userController)
function formatPublicProfile(user) {
  const obj = typeof user.toJSON === 'function' ? user.toJSON() : user;
  delete obj.email;
  delete obj.privacySettings;
  delete obj.notificationSettings;
  if (user.privacySettings && !user.privacySettings.showOnlineStatus) obj.status = 'offline';
  if (user.privacySettings && !user.privacySettings.showLastSeen) delete obj.lastSeen;
  return obj;
}

// GET /api/v1/search/messages
export async function searchMessages(req, res, next) {
  try {
    const {
      q,
      conversationId,
      senderId,
      startDate,
      endDate,
      attachmentType,
      cursor,
      limit = 20,
    } = req.query;

    if (!q) {
      throw new BadRequestError('Search query (q) is required');
    }

    const maxLimit = Math.min(parseInt(limit, 10) || 20, 50);
    const currentUserId = req.user._id.toString();

    // Find all conversations the user is a member of to restrict search
    let allowedConversationIds = [];
    if (conversationId) {
      const conv = await Conversation.findOne({
        _id: conversationId,
        'members.userId': currentUserId,
      });
      if (!conv) {
        return res.status(200).json(createApiResponse(true, { messages: [], nextCursor: null }));
      }
      allowedConversationIds.push(conv._id);
    } else {
      const convs = await Conversation.find({ 'members.userId': currentUserId }, '_id');
      allowedConversationIds = convs.map((c) => c._id);
    }

    if (allowedConversationIds.length === 0) {
      return res.status(200).json(createApiResponse(true, { messages: [], nextCursor: null }));
    }

    // Build query
    const query = {
      $text: { $search: q },
      conversationId: { $in: allowedConversationIds },
      isDeleted: false,
    };

    if (senderId) query.senderId = senderId;
    if (attachmentType) query['attachments.type'] = attachmentType;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (cursor) {
      query.createdAt = { ...query.createdAt, $lt: new Date(cursor) };
    }

    // Execute search (sort by createdAt descending instead of text score for cursor pagination)
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(maxLimit)
      .populate('senderId', '_id username displayName avatarUrl status role')
      .populate('conversationId', '_id name type')
      .exec();

    const nextCursor =
      messages.length === maxLimit ? messages[messages.length - 1].createdAt.toISOString() : null;

    res.status(200).json(createApiResponse(true, { messages, nextCursor }));
  } catch (error) {
    next(error);
  }
}

// GET /api/v1/search/users
export async function searchUsers(req, res, next) {
  try {
    const { q, limit = 20 } = req.query;

    if (!q) {
      throw new BadRequestError('Search query (q) is required');
    }

    const maxLimit = Math.min(parseInt(limit, 10) || 20, 50);

    const users = await User.find(
      { $text: { $search: q } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(maxLimit)
      .exec();

    const sanitizedUsers = users.map(formatPublicProfile);

    res.status(200).json(createApiResponse(true, { users: sanitizedUsers }));
  } catch (error) {
    next(error);
  }
}

// GET /api/v1/search/conversations
export async function searchConversations(req, res, next) {
  try {
    const { q, limit = 20 } = req.query;
    const currentUserId = req.user._id.toString();

    if (!q) {
      throw new BadRequestError('Search query (q) is required');
    }

    const maxLimit = Math.min(parseInt(limit, 10) || 20, 50);

    const conversations = await Conversation.find(
      {
        $text: { $search: q },
        'members.userId': currentUserId,
      },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(maxLimit)
      .populate('members.userId', '_id username displayName avatarUrl status role')
      .populate('lastMessageId')
      .exec();

    res.status(200).json(createApiResponse(true, { conversations }));
  } catch (error) {
    next(error);
  }
}
