import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { createApiResponse, SOCKET_EVENTS } from '@virexo/shared';
import { markRead } from '../services/receiptService.js';
import { getIO } from '../socket/socketServer.js';

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
    const now = new Date();
    const message = new Message({
      conversationId,
      senderId: currentUserId,
      content,
      attachments,
      idempotencyKey,
      readBy: [{ userId: currentUserId, readAt: now }],
    });

    await message.save();

    // Update Conversation lastMessageId, recency timestamp, and sender cursors
    conversation.lastMessageId = message._id;
    conversation.updatedAt = now;
    member.lastReadAt = now;
    member.lastDeliveredAt = now;
    await conversation.save();

    await populateMessage(message);

    // Broadcast real-time message:new event to conversation room
    try {
      const io = getIO();
      io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.MESSAGE_NEW, {
        message,
        conversationId,
      });
    } catch {
      // Socket server may not be initialized in test mode
    }

    res.status(201).json(createApiResponse(true, { message, isExisting: false }));
  } catch (error) {
    next(error);
  }
}

// GET /api/v1/messages/conversation/:conversationId — Cursor-based History Pagination & Status Mapping
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

    // Map lifecycle status relative to other members in conversation
    const otherMembers = conversation.members.filter((m) => m.userId.toString() !== currentUserId);

    const items = itemsDesc.reverse().map((msgDoc) => {
      const msgObj = msgDoc.toObject();
      const msgDate = new Date(msgObj.createdAt);

      if (msgObj.senderId._id.toString() === currentUserId) {
        // Calculate status for sender: read if any other member has lastReadAt >= msgDate
        const isReadByOthers = otherMembers.some((m) => m.lastReadAt && new Date(m.lastReadAt) >= msgDate);
        const isDeliveredToOthers = otherMembers.some((m) => m.lastDeliveredAt && new Date(m.lastDeliveredAt) >= msgDate);

        msgObj.status = isReadByOthers ? 'read' : isDeliveredToOthers ? 'delivered' : 'sent';
      } else {
        msgObj.status = 'delivered';
      }

      return msgObj;
    });

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
        memberCursors: conversation.members,
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

    const result = await markRead(conversationId, currentUserId);
    if (!result) {
      throw new NotFoundError('Conversation not found or user not a member', 'CONVERSATION_NOT_FOUND');
    }

    res.status(200).json(
      createApiResponse(true, {
        conversationId,
        lastReadAt: result.lastReadAt,
        unreadCount: result.unreadCount,
      })
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

    // Broadcast message:deleted event to conversation room
    try {
      const io = getIO();
      io.to(`conversation:${message.conversationId}`).emit(SOCKET_EVENTS.MESSAGE_DELETED, {
        messageId: message._id,
        conversationId: message.conversationId,
      });
    } catch {
      // Ignore if socket IO server is not booted in test mode
    }

    res.status(200).json(
      createApiResponse(true, { message, info: 'Message deleted successfully' })
    );
  } catch (error) {
    next(error);
  }
}
