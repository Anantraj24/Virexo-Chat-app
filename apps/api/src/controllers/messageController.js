import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { createApiResponse } from '@virexo/shared';

// Helper: Populate message sender profile DTO
async function populateMessage(doc) {
  return doc.populate({
    path: 'senderId',
    select: '_id username displayName avatarUrl status role',
  });
}

// POST /api/v1/messages — Create Text/Media Message
export async function createMessage(req, res, next) {
  try {
    const { conversationId, content = '', attachments = [], idempotencyKey } = req.body;
    const currentUserId = req.user._id.toString();

    // Verify conversation exists and user is a member
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const member = conversation.members.find((m) => m.userId.toString() === currentUserId);
    if (!member) {
      throw new ForbiddenError('You are not a member of this conversation', 'NOT_A_MEMBER');
    }

    // Check Idempotency Key Deduplication
    if (idempotencyKey) {
      const existingMessage = await Message.findOne({
        conversationId,
        senderId: currentUserId,
        idempotencyKey,
      });

      if (existingMessage) {
        await populateMessage(existingMessage);
        return res.status(200).json(
          createApiResponse(true, { message: existingMessage, isExisting: true })
        );
      }
    }

    // Create Message document
    const message = new Message({
      conversationId,
      senderId: currentUserId,
      content,
      attachments,
      idempotencyKey,
      readBy: [{ userId: currentUserId, readAt: new Date() }],
    });

    await message.save();

    // Update Conversation lastMessageId and recency timestamp
    conversation.lastMessageId = message._id;
    conversation.updatedAt = new Date();

    // Update sender's lastReadAt in conversation
    member.lastReadAt = new Date();
    await conversation.save();

    await populateMessage(message);

    res.status(201).json(createApiResponse(true, { message, isExisting: false }));
  } catch (error) {
    next(error);
  }
}

// GET /api/v1/messages/conversation/:conversationId — Cursor-based History Pagination & Unread Count
export async function getMessageHistory(req, res, next) {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user._id.toString();
    const limit = parseInt(req.query.limit, 10) || 50;
    const cursor = req.query.cursor ? new Date(req.query.cursor) : null;

    // Verify conversation exists and user is a member
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const member = conversation.members.find((m) => m.userId.toString() === currentUserId);
    if (!member) {
      throw new ForbiddenError('You are not a member of this conversation', 'NOT_A_MEMBER');
    }

    const query = { conversationId };
    if (cursor) {
      query.createdAt = { $lt: cursor };
    }

    // Fetch messages in reverse chronological order
    const rawMessages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate({
        path: 'senderId',
        select: '_id username displayName avatarUrl status role',
      })
      .exec();

    const hasNextPage = rawMessages.length > limit;
    const itemsDesc = hasNextPage ? rawMessages.slice(0, limit) : rawMessages;
    const nextCursor = hasNextPage ? itemsDesc[itemsDesc.length - 1].createdAt.toISOString() : null;

    // Reverse to chronological order for client timeline
    const items = itemsDesc.reverse();

    // Calculate unread count (messages created after member.lastReadAt from other senders)
    const unreadCount = await Message.countDocuments({
      conversationId,
      senderId: { $ne: currentUserId },
      createdAt: { $gt: member.lastReadAt || new Date(0) },
      isDeleted: false,
    });

    res.status(200).json(
      createApiResponse(true, {
        messages: items,
        pagination: {
          limit,
          hasNextPage,
          nextCursor,
        },
        unreadCount,
      })
    );
  } catch (error) {
    next(error);
  }
}

// POST /api/v1/messages/conversation/:conversationId/read — Mark Conversation as Read
export async function markConversationRead(req, res, next) {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user._id.toString();

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const member = conversation.members.find((m) => m.userId.toString() === currentUserId);
    if (!member) {
      throw new ForbiddenError('You are not a member of this conversation', 'NOT_A_MEMBER');
    }

    const now = new Date();
    member.lastReadAt = now;
    await conversation.save();

    // Add current user to readBy array of messages in conversation
    await Message.updateMany(
      {
        conversationId,
        'readBy.userId': { $ne: currentUserId },
      },
      {
        $addToSet: { readBy: { userId: currentUserId, readAt: now } },
      }
    );

    res.status(200).json(
      createApiResponse(true, { conversationId, lastReadAt: now, unreadCount: 0 })
    );
  } catch (error) {
    next(error);
  }
}

// DELETE /api/v1/messages/:id — Soft Deletion Foundation
export async function deleteMessage(req, res, next) {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id.toString();

    const message = await Message.findById(id);
    if (!message) {
      throw new NotFoundError('Message not found', 'MESSAGE_NOT_FOUND');
    }

    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const member = conversation.members.find((m) => m.userId.toString() === currentUserId);
    if (!member) {
      throw new ForbiddenError('You are not a member of this conversation', 'NOT_A_MEMBER');
    }

    const isSender = message.senderId.toString() === currentUserId;
    const isOwner = member.role === 'owner';

    if (!isSender && !isOwner) {
      throw new ForbiddenError('Only the message sender or group owner can delete this message', 'PERMISSION_DENIED');
    }

    message.isDeleted = true;
    message.content = '[This message was deleted]';
    message.attachments = [];

    await message.save();
    await populateMessage(message);

    res.status(200).json(
      createApiResponse(true, { message, info: 'Message deleted successfully' })
    );
  } catch (error) {
    next(error);
  }
}
