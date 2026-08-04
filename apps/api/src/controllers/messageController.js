import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { createApiResponse, SOCKET_EVENTS } from '@virexo/shared';
import { markRead } from '../services/receiptService.js';
import { getIO } from '../socket/socketServer.js';
import { deleteResource } from '../services/cloudinary.js';

const DELETE_FOR_EVERYONE_WINDOW_MS = 2 * 60 * 1000;

async function populateMessage(doc) {
  return doc.populate({
    path: 'senderId',
    select: '_id username displayName avatarUrl status role',
  });
}

async function verifyMessageAccess(messageId, currentUserId) {
  const message = await Message.findById(messageId).populate('conversationId');
  if (!message) {
    throw new NotFoundError('Message not found', 'MESSAGE_NOT_FOUND');
  }
  const conversation = message.conversationId;
  const member = conversation.members.find((m) => m.userId.toString() === currentUserId);
  if (!member) {
    throw new ForbiddenError('You are not a member of this conversation', 'NOT_A_MEMBER');
  }
  return { message, conversation, member };
}

export async function createMessage(req, res, next) {
  try {
    const { conversationId, content = '', attachments = [], idempotencyKey } = req.body;
    const currentUserId = req.user._id.toString();

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const member = conversation.members.find((m) => m.userId.toString() === currentUserId);
    if (!member) {
      throw new ForbiddenError('You are not a member of this conversation', 'NOT_A_MEMBER');
    }

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

    const now = new Date();
    const message = new Message({
      conversationId,
      senderId: currentUserId,
      content,
      attachments,
      idempotencyKey,
      readBy: [{ userId: currentUserId, readAt: now }],
      audit: { createdBy: currentUserId },
    });

    await message.save();

    conversation.lastMessageId = message._id;
    conversation.updatedAt = now;
    member.lastReadAt = now;
    member.lastDeliveredAt = now;
    await conversation.save();

    await populateMessage(message);

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

export async function getMessageHistory(req, res, next) {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user._id.toString();
    const limit = parseInt(req.query.limit, 10) || 50;
    const cursor = req.query.cursor ? new Date(req.query.cursor) : null;

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

    const otherMembers = conversation.members.filter((m) => m.userId.toString() !== currentUserId);

    const items = itemsDesc.reverse().map((msgDoc) => {
      const msgObj = msgDoc.toObject();
      const msgDate = new Date(msgObj.createdAt);

      if (msgObj.senderId._id.toString() === currentUserId) {
        const isReadByOthers = otherMembers.some((m) => m.lastReadAt && new Date(m.lastReadAt) >= msgDate);
        const isDeliveredToOthers = otherMembers.some((m) => m.lastDeliveredAt && new Date(m.lastDeliveredAt) >= msgDate);

        msgObj.status = isReadByOthers ? 'read' : isDeliveredToOthers ? 'delivered' : 'sent';
      } else {
        msgObj.status = 'delivered';
      }

      return msgObj;
    });

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

export async function getMessagesAround(req, res, next) {
  try {
    const { conversationId, messageId } = req.params;
    const currentUserId = req.user._id.toString();

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const member = conversation.members.find((m) => m.userId.toString() === currentUserId);
    if (!member) {
      throw new ForbiddenError('You are not a member of this conversation', 'NOT_A_MEMBER');
    }

    const targetMessage = await Message.findById(messageId);
    if (!targetMessage || targetMessage.conversationId.toString() !== conversationId) {
      throw new NotFoundError('Message not found in this conversation', 'MESSAGE_NOT_FOUND');
    }

    // Fetch up to 20 messages older than target
    const olderMessages = await Message.find({
      conversationId,
      createdAt: { $lt: targetMessage.createdAt },
      isDeleted: false
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate({
        path: 'senderId',
        select: '_id username displayName avatarUrl status role',
      })
      .exec();

    // Fetch up to 20 messages newer than target
    const newerMessages = await Message.find({
      conversationId,
      createdAt: { $gt: targetMessage.createdAt },
      isDeleted: false
    })
      .sort({ createdAt: 1 })
      .limit(20)
      .populate({
        path: 'senderId',
        select: '_id username displayName avatarUrl status role',
      })
      .exec();

    await targetMessage.populate({
      path: 'senderId',
      select: '_id username displayName avatarUrl status role',
    });

    // Combine them (older need to be reversed to chronological)
    const combinedDesc = [
      ...newerMessages.reverse(),
      targetMessage,
      ...olderMessages,
    ];

    const otherMembers = conversation.members.filter((m) => m.userId.toString() !== currentUserId);

    const items = combinedDesc.reverse().map((msgDoc) => {
      const msgObj = typeof msgDoc.toObject === 'function' ? msgDoc.toObject() : msgDoc;
      const msgDate = new Date(msgObj.createdAt);

      if (msgObj.senderId._id.toString() === currentUserId) {
        const isReadByOthers = otherMembers.some((m) => m.lastReadAt && new Date(m.lastReadAt) >= msgDate);
        const isDeliveredToOthers = otherMembers.some((m) => m.lastDeliveredAt && new Date(m.lastDeliveredAt) >= msgDate);

        msgObj.status = isReadByOthers ? 'read' : isDeliveredToOthers ? 'delivered' : 'sent';
      } else {
        msgObj.status = 'delivered';
      }

      return msgObj;
    });

    const nextCursor = olderMessages.length === 20 ? olderMessages[olderMessages.length - 1].createdAt.toISOString() : null;

    res.status(200).json(createApiResponse(true, { messages: items, nextCursor, targetId: targetMessage._id }));
  } catch (error) {
    next(error);
  }
}

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

export async function editMessage(req, res, next) {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id.toString();
    const { content } = req.body;

    if (!content || !content.trim()) {
      throw new BadRequestError('Message content cannot be empty', 'EMPTY_CONTENT');
    }

    if (content.length > 2000) {
      throw new BadRequestError('Message content cannot exceed 2000 characters', 'CONTENT_TOO_LONG');
    }

    const { message, conversation } = await verifyMessageAccess(id, currentUserId);

    if (message.senderId.toString() !== currentUserId) {
      throw new ForbiddenError('Only the message sender can edit this message', 'PERMISSION_DENIED');
    }

    if (message.isDeleted) {
      throw new ForbiddenError('Cannot edit a deleted message', 'MESSAGE_DELETED');
    }

    const previousContent = message.content;
    message.content = content.trim();
    message.isEdited = true;
    message.audit.editedAt = new Date();
    message.audit.editedBy = currentUserId;

    await message.save();
    await populateMessage(message);

    try {
      const io = getIO();
      io.to(`conversation:${conversation._id}`).emit(SOCKET_EVENTS.MESSAGE_EDITED, {
        messageId: message._id,
        conversationId: conversation._id,
        content: message.content,
        isEdited: message.isEdited,
        editedAt: message.audit.editedAt,
      });
    } catch {
      // Ignore if socket IO server is not booted in test mode
    }

    res.status(200).json(
      createApiResponse(true, { message, previousContent })
    );
  } catch (error) {
    next(error);
  }
}

export async function deleteMessage(req, res, next) {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id.toString();

    const { message, conversation } = await verifyMessageAccess(id, currentUserId);

    const isSender = message.senderId.toString() === currentUserId;
    const isOwner = conversation.members.find((m) => m.userId.toString() === currentUserId)?.role === 'owner';

    if (!isSender && !isOwner) {
      throw new ForbiddenError('Only the message sender or group owner can delete this message', 'PERMISSION_DENIED');
    }

    message.isDeleted = true;
    message.content = '[This message was deleted]';
    message.attachments = [];
    message.audit.deletedAt = new Date();
    message.audit.deletedBy = currentUserId;
    message.audit.deletionScope = 'self';

    await message.save();
    await populateMessage(message);

    try {
      const io = getIO();
      io.to(`conversation:${message.conversationId}`).emit(SOCKET_EVENTS.MESSAGE_DELETED, {
        messageId: message._id,
        conversationId: message.conversationId,
        deletionScope: 'self',
        deletedBy: currentUserId,
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

export async function deleteMessageForEveryone(req, res, next) {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id.toString();

    const { message, conversation, member } = await verifyMessageAccess(id, currentUserId);

    const isSender = message.senderId.toString() === currentUserId;
    const isOwner = member.role === 'owner';
    const isAdmin = member.role === 'admin';

    if (!isSender && !isOwner && !isAdmin) {
      throw new ForbiddenError('Only the sender, group owner, or admin can delete this message for everyone', 'PERMISSION_DENIED');
    }

    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    if (messageAge > DELETE_FOR_EVERYONE_WINDOW_MS) {
      throw new ForbiddenError('Messages can only be deleted for everyone within 2 minutes of sending', 'DELETE_WINDOW_EXPIRED');
    }

    if (message.audit.deletionScope === 'everyone') {
      throw new BadRequestError('Message already deleted for everyone', 'ALREADY_DELETED');
    }

    if (message.attachments && message.attachments.length > 0) {
      for (const attachment of message.attachments) {
        if (attachment.publicId) {
          // Fire and forget or await. Let's fire and forget, logging any error is better but for now catching is fine.
          deleteResource(attachment.publicId, attachment.type === 'document' ? 'raw' : (attachment.type === 'audio' || attachment.type === 'video' ? 'video' : 'image')).catch(() => {});
        }
      }
    }

    message.isDeleted = true;
    message.content = '[This message was deleted]';
    message.attachments = [];
    message.audit.deletedAt = new Date();
    message.audit.deletedBy = currentUserId;
    message.audit.deletionScope = 'everyone';

    await message.save();
    await populateMessage(message);

    try {
      const io = getIO();
      io.to(`conversation:${message.conversationId}`).emit(SOCKET_EVENTS.MESSAGE_DELETED, {
        messageId: message._id,
        conversationId: message.conversationId,
        deletionScope: 'everyone',
        deletedBy: currentUserId,
      });
    } catch {
      // Ignore if socket IO server is not booted in test mode
    }

    res.status(200).json(
      createApiResponse(true, { message, info: 'Message deleted for everyone' })
    );
  } catch (error) {
    next(error);
  }
}

export async function pinMessage(req, res, next) {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id.toString();

    const { message, conversation, member } = await verifyMessageAccess(id, currentUserId);

    if (conversation.type === 'group' || conversation.type === 'channel') {
      if (member.role !== 'owner' && member.role !== 'admin') {
        throw new ForbiddenError('Only owners and admins can pin messages', 'PERMISSION_DENIED');
      }
    }

    if (message.isDeleted) {
      throw new ForbiddenError('Cannot pin a deleted message', 'MESSAGE_DELETED');
    }

    if (message.isPinned) {
      throw new BadRequestError('Message is already pinned', 'ALREADY_PINNED');
    }

    message.isPinned = true;
    message.pinnedAt = new Date();
    message.pinnedBy = currentUserId;

    await message.save();
    await populateMessage(message);

    try {
      const io = getIO();
      io.to(`conversation:${conversation._id}`).emit(SOCKET_EVENTS.MESSAGE_PINNED, {
        messageId: message._id,
        conversationId: conversation._id,
        pinnedBy: currentUserId,
      });
    } catch {
      // Ignore if socket IO server is not booted in test mode
    }

    res.status(200).json(createApiResponse(true, { message, info: 'Message pinned' }));
  } catch (error) {
    next(error);
  }
}

export async function unpinMessage(req, res, next) {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id.toString();

    const { message, conversation, member } = await verifyMessageAccess(id, currentUserId);

    const isPinner = message.pinnedBy && message.pinnedBy.toString() === currentUserId;
    const isOwner = member.role === 'owner';
    const isAdmin = member.role === 'admin';

    if (!isPinner && !isOwner && !isAdmin) {
      throw new ForbiddenError('Only the pinner, owner, or admin can unpin this message', 'PERMISSION_DENIED');
    }

    if (!message.isPinned) {
      throw new BadRequestError('Message is not pinned', 'NOT_PINNED');
    }

    message.isPinned = false;
    message.pinnedAt = null;
    message.pinnedBy = null;

    await message.save();
    await populateMessage(message);

    try {
      const io = getIO();
      io.to(`conversation:${conversation._id}`).emit(SOCKET_EVENTS.MESSAGE_UNPINNED, {
        messageId: message._id,
        conversationId: conversation._id,
        unpinnedBy: currentUserId,
      });
    } catch {
      // Ignore if socket IO server is not booted in test mode
    }

    res.status(200).json(createApiResponse(true, { message, info: 'Message unpinned' }));
  } catch (error) {
    next(error);
  }
}

export async function addReaction(req, res, next) {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id.toString();
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== 'string' || emoji.length > 2) {
      throw new BadRequestError('Valid emoji is required', 'INVALID_EMOJI');
    }

    const { message, conversation } = await verifyMessageAccess(id, currentUserId);

    if (message.isDeleted) {
      throw new ForbiddenError('Cannot react to a deleted message', 'MESSAGE_DELETED');
    }

    const existingReaction = message.reactions.find(
      (r) => r.emoji === emoji && r.userId.toString() === currentUserId
    );

    if (existingReaction) {
      message.reactions = message.reactions.filter(
        (r) => !(r.emoji === emoji && r.userId.toString() === currentUserId)
      );
    } else {
      message.reactions.push({ emoji, userId: currentUserId });
    }

    await message.save();
    await populateMessage(message);

    try {
      const io = getIO();
      io.to(`conversation:${conversation._id}`).emit(
        existingReaction ? SOCKET_EVENTS.MESSAGE_REACTION_REMOVED : SOCKET_EVENTS.MESSAGE_REACTION_ADDED,
        {
          messageId: message._id,
          conversationId: conversation._id,
          emoji,
          userId: currentUserId,
          action: existingReaction ? 'removed' : 'added',
        }
      );
    } catch {
      // Ignore if socket IO server is not booted in test mode
    }

    res.status(200).json(createApiResponse(true, { message, action: existingReaction ? 'removed' : 'added' }));
  } catch (error) {
    next(error);
  }
}

export async function removeReaction(req, res, next) {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id.toString();
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== 'string') {
      throw new BadRequestError('Emoji is required', 'INVALID_EMOJI');
    }

    const { message, conversation } = await verifyMessageAccess(id, currentUserId);

    const initialLength = message.reactions.length;
    message.reactions = message.reactions.filter(
      (r) => !(r.emoji === emoji && r.userId.toString() === currentUserId)
    );

    if (message.reactions.length === initialLength) {
      throw new BadRequestError('No such reaction found', 'REACTION_NOT_FOUND');
    }

    await message.save();
    await populateMessage(message);

    try {
      const io = getIO();
      io.to(`conversation:${conversation._id}`).emit(SOCKET_EVENTS.MESSAGE_REACTION_REMOVED, {
        messageId: message._id,
        conversationId: conversation._id,
        emoji,
        userId: currentUserId,
      });
    } catch {
      // Ignore if socket IO server is not booted in test mode
    }

    res.status(200).json(createApiResponse(true, { message, info: 'Reaction removed' }));
  } catch (error) {
    next(error);
  }
}

// POST /api/v1/messages/:id/forward — Forward Message
export async function forwardMessage(req, res, next) {
  try {
    const { id } = req.params;
    const currentUserId = req.user._id.toString();
    const { conversationId } = req.body;

    if (!conversationId) {
      throw new BadRequestError('Conversation ID is required', 'CONVERSATION_ID_REQUIRED');
    }

    const sourceMessage = await Message.findById(id);
    if (!sourceMessage) {
      throw new NotFoundError('Message not found', 'MESSAGE_NOT_FOUND');
    }

    if (sourceMessage.isDeleted) {
      throw new ForbiddenError('Cannot forward a deleted message', 'MESSAGE_DELETED');
    }

    // Verify target conversation exists and user is a member
    const targetConversation = await Conversation.findById(conversationId);
    if (!targetConversation) {
      throw new NotFoundError('Target conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const targetMember = targetConversation.members.find((m) => m.userId.toString() === currentUserId);
    if (!targetMember) {
      throw new ForbiddenError('You are not a member of the target conversation', 'NOT_A_MEMBER');
    }

    // Create forwarded message
    const now = new Date();
    const forwardedMessage = new Message({
      conversationId,
      senderId: currentUserId,
      content: sourceMessage.content || '',
      attachments: sourceMessage.attachments || [],
      forwardedFrom: sourceMessage._id,
      readBy: [{ userId: currentUserId, readAt: now }],
      audit: { createdBy: currentUserId },
    });

    await forwardedMessage.save();

    // Update target conversation
    targetConversation.lastMessageId = forwardedMessage._id;
    targetConversation.updatedAt = now;
    targetMember.lastReadAt = now;
    targetMember.lastDeliveredAt = now;
    await targetConversation.save();

    await forwardedMessage.populate({
      path: 'senderId',
      select: '_id username displayName avatarUrl status role',
    });

    // Broadcast real-time message:new event to target conversation room
    try {
      const io = getIO();
      io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.MESSAGE_NEW, {
        message: forwardedMessage,
        conversationId,
      });
    } catch {
      // Ignore if socket IO server is not booted in test mode
    }

    res.status(201).json(createApiResponse(true, { message: forwardedMessage }));
  } catch (error) {
    next(error);
  }
}