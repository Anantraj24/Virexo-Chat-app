import prisma from '../config/prisma.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { createApiResponse, SOCKET_EVENTS } from '@virexo/shared';
import { markRead } from '../services/receiptService.js';
import { getIO } from '../socket/socketServer.js';
import { deleteResource } from '../services/cloudinary.js';
import { triggerNotification } from './notificationController.js';

const DELETE_FOR_EVERYONE_WINDOW_MS = 2 * 60 * 1000;

const messageInclude = {
  sender: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      status: true,
      role: true
    }
  },
  attachments: true,
  reactions: true,
  readBy: true,
  audit: true
};

async function verifyMessageAccess(messageId, currentUserId) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      conversation: {
        include: { members: true }
      },
      ...messageInclude
    }
  });

  if (!message) {
    throw new NotFoundError('Message not found', 'MESSAGE_NOT_FOUND');
  }

  const conversation = message.conversation;
  const member = conversation.members.find((m) => m.userId === currentUserId);
  if (!member) {
    throw new ForbiddenError('You are not a member of this conversation', 'NOT_A_MEMBER');
  }
  return { message, conversation, member };
}

export async function createMessage(req, res, next) {
  try {
    const { conversationId, content = '', attachments = [], idempotencyKey, replyTo, forwardedFrom } = req.body;
    const currentUserId = req.user.id || req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true }
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const member = conversation.members.find((m) => m.userId === currentUserId);
    if (!member) {
      throw new ForbiddenError('You are not a member of this conversation', 'NOT_A_MEMBER');
    }

    if (idempotencyKey) {
      const existingMessage = await prisma.message.findUnique({
        where: { idempotencyKey },
        include: messageInclude
      });

      if (existingMessage && existingMessage.senderId === currentUserId) {
        return res.status(200).json(
          createApiResponse(true, { message: existingMessage, isExisting: true })
        );
      }
    }

    const now = new Date();
    
    // Create message and audit in transaction
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: currentUserId,
        content,
        idempotencyKey: idempotencyKey || null,
        replyToId: replyTo || null,
        forwardedFromId: forwardedFrom || null,
        attachments: {
          create: attachments.map(a => ({
            url: a.url,
            publicId: a.publicId || "",
            type: a.type,
            filename: a.filename,
            size: a.size,
            duration: a.duration || null,
            width: a.width || null,
            height: a.height || null
          }))
        },
        readBy: {
          create: { userId: currentUserId, readAt: now }
        },
        audit: {
          create: { createdById: currentUserId }
        }
      },
      include: messageInclude
    });

    // Update conversation and member in transaction
    await prisma.$transaction([
      prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageId: message.id,
          updatedAt: now
        }
      }),
      prisma.conversationMember.update({
        where: { userId_conversationId: { userId: currentUserId, conversationId } },
        data: {
          lastReadAt: now,
          lastDeliveredAt: now
        }
      })
    ]);

    try {
      const io = getIO();
      io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.MESSAGE_NEW, {
        message,
        conversationId,
      });
    } catch {
      // Socket server may not be initialized in test mode
    }

    if (replyTo) {
      const originalMessage = await prisma.message.findUnique({ where: { id: replyTo } });
      if (originalMessage && originalMessage.senderId !== currentUserId) {
        triggerNotification({
          recipientId: originalMessage.senderId,
          actorId: currentUserId,
          type: 'message_reply',
          entityId: message.id,
          entityModel: 'Message',
          content: `replied to your message in "${conversation.type === 'group' ? conversation.name : 'a direct message'}"`,
        }).catch(console.error);
      }
    }

    // Extract mentions @username
    const mentionRegex = /@(\w+)/g;
    const matches = [...content.matchAll(mentionRegex)];
    if (matches.length > 0) {
      const usernames = matches.map((m) => m[1]);
      const mentionedUsers = await prisma.user.findMany({ where: { username: { in: usernames } } });
      
      for (const mentionedUser of mentionedUsers) {
        if (mentionedUser.id !== currentUserId) {
          const isMember = conversation.members.some(m => m.userId === mentionedUser.id);
          if (isMember) {
            triggerNotification({
              recipientId: mentionedUser.id,
              actorId: currentUserId,
              type: 'mention',
              entityId: message.id,
              entityModel: 'Message',
              content: `mentioned you in "${conversation.type === 'group' ? conversation.name : 'a direct message'}"`,
            }).catch(console.error);
          }
        }
      }
    }

    res.status(201).json(createApiResponse(true, { message, isExisting: false }));
  } catch (error) {
    next(error);
  }
}

export async function getMessageHistory(req, res, next) {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id || req.user.id;
    const limit = parseInt(req.query.limit, 10) || 50;
    const cursor = req.query.cursor ? new Date(req.query.cursor) : null;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true }
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const member = conversation.members.find((m) => m.userId === currentUserId);
    if (!member) {
      throw new ForbiddenError('You are not a member of this conversation', 'NOT_A_MEMBER');
    }

    const where = { conversationId };
    if (cursor) {
      where.createdAt = { lt: cursor };
    }

    const rawMessages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: messageInclude
    });

    const hasNextPage = rawMessages.length > limit;
    const itemsDesc = hasNextPage ? rawMessages.slice(0, limit) : rawMessages;
    const nextCursor = hasNextPage ? itemsDesc[itemsDesc.length - 1].createdAt.toISOString() : null;

    const otherMembers = conversation.members.filter((m) => m.userId !== currentUserId);

    const items = itemsDesc.reverse().map((msgObj) => {
      const msgDate = new Date(msgObj.createdAt);

      if (msgObj.senderId === currentUserId) {
        const isReadByOthers = otherMembers.some((m) => m.lastReadAt && new Date(m.lastReadAt) >= msgDate);
        const isDeliveredToOthers = otherMembers.some((m) => m.lastDeliveredAt && new Date(m.lastDeliveredAt) >= msgDate);

        msgObj.status = isReadByOthers ? 'read' : isDeliveredToOthers ? 'delivered' : 'sent';
      } else {
        msgObj.status = 'delivered';
      }

      return msgObj;
    });

    const unreadCount = await prisma.message.count({
      where: {
        conversationId,
        senderId: { not: currentUserId },
        createdAt: { gt: member.lastReadAt || new Date(0) },
        isDeleted: false,
      }
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
    const currentUserId = req.user.id || req.user.id;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true }
    });

    if (!conversation) {
      throw new NotFoundError('Conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const member = conversation.members.find((m) => m.userId === currentUserId);
    if (!member) {
      throw new ForbiddenError('You are not a member of this conversation', 'NOT_A_MEMBER');
    }

    const targetMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: messageInclude
    });

    if (!targetMessage || targetMessage.conversationId !== conversationId) {
      throw new NotFoundError('Message not found in this conversation', 'MESSAGE_NOT_FOUND');
    }

    // Fetch up to 20 messages older than target
    const olderMessages = await prisma.message.findMany({
      where: {
        conversationId,
        createdAt: { lt: targetMessage.createdAt },
        isDeleted: false
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: messageInclude
    });

    // Fetch up to 20 messages newer than target
    const newerMessages = await prisma.message.findMany({
      where: {
        conversationId,
        createdAt: { gt: targetMessage.createdAt },
        isDeleted: false
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
      include: messageInclude
    });

    // Combine them (older need to be reversed to chronological)
    const combinedDesc = [
      ...newerMessages.reverse(),
      targetMessage,
      ...olderMessages,
    ];

    const otherMembers = conversation.members.filter((m) => m.userId !== currentUserId);

    const items = combinedDesc.reverse().map((msgObj) => {
      const msgDate = new Date(msgObj.createdAt);

      if (msgObj.senderId === currentUserId) {
        const isReadByOthers = otherMembers.some((m) => m.lastReadAt && new Date(m.lastReadAt) >= msgDate);
        const isDeliveredToOthers = otherMembers.some((m) => m.lastDeliveredAt && new Date(m.lastDeliveredAt) >= msgDate);

        msgObj.status = isReadByOthers ? 'read' : isDeliveredToOthers ? 'delivered' : 'sent';
      } else {
        msgObj.status = 'delivered';
      }

      return msgObj;
    });

    const nextCursor = olderMessages.length === 20 ? olderMessages[olderMessages.length - 1].createdAt.toISOString() : null;

    res.status(200).json(createApiResponse(true, { messages: items, nextCursor, targetId: targetMessage.id }));
  } catch (error) {
    next(error);
  }
}

export async function markConversationRead(req, res, next) {
  try {
    const { conversationId } = req.params;
    const currentUserId = req.user.id || req.user.id;

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
    const currentUserId = req.user.id || req.user.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      throw new BadRequestError('Message content cannot be empty', 'EMPTY_CONTENT');
    }

    if (content.length > 2000) {
      throw new BadRequestError('Message content cannot exceed 2000 characters', 'CONTENT_TOO_LONG');
    }

    const { message, conversation } = await verifyMessageAccess(id, currentUserId);

    if (message.senderId !== currentUserId) {
      throw new ForbiddenError('Only the message sender can edit this message', 'PERMISSION_DENIED');
    }

    if (message.isDeleted) {
      throw new ForbiddenError('Cannot edit a deleted message', 'MESSAGE_DELETED');
    }

    const previousContent = message.content;
    const now = new Date();

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        content: content.trim(),
        isEdited: true,
        audit: {
          update: {
            editedAt: now,
            editedById: currentUserId
          }
        }
      },
      include: messageInclude
    });

    try {
      const io = getIO();
      io.to(`conversation:${conversation.id}`).emit(SOCKET_EVENTS.MESSAGE_EDITED, {
        messageId: updatedMessage.id,
        conversationId: conversation.id,
        content: updatedMessage.content,
        isEdited: updatedMessage.isEdited,
        editedAt: updatedMessage.audit.editedAt,
      });
    } catch {
      // Ignore if socket IO server is not booted in test mode
    }

    res.status(200).json(
      createApiResponse(true, { message: updatedMessage, previousContent })
    );
  } catch (error) {
    next(error);
  }
}

export async function deleteMessage(req, res, next) {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id || req.user.id;

    const { message, conversation } = await verifyMessageAccess(id, currentUserId);

    const isSender = message.senderId === currentUserId;
    const isOwner = conversation.members.find((m) => m.userId === currentUserId)?.role === 'owner';

    if (!isSender && !isOwner) {
      throw new ForbiddenError('Only the message sender or group owner can delete this message', 'PERMISSION_DENIED');
    }

    // Delete attachments from DB
    await prisma.attachment.deleteMany({ where: { messageId: id } });

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        isDeleted: true,
        content: '[This message was deleted]',
        audit: {
          update: {
            deletedAt: new Date(),
            deletedById: currentUserId,
            deletionScope: 'self'
          }
        }
      },
      include: messageInclude
    });

    try {
      const io = getIO();
      io.to(`conversation:${updatedMessage.conversationId}`).emit(SOCKET_EVENTS.MESSAGE_DELETED, {
        messageId: updatedMessage.id,
        conversationId: updatedMessage.conversationId,
        deletionScope: 'self',
        deletedBy: currentUserId,
      });
    } catch {
      // Ignore if socket IO server is not booted in test mode
    }

    res.status(200).json(
      createApiResponse(true, { message: updatedMessage, info: 'Message deleted successfully' })
    );
  } catch (error) {
    next(error);
  }
}

export async function deleteMessageForEveryone(req, res, next) {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id || req.user.id;

    const { message, conversation, member } = await verifyMessageAccess(id, currentUserId);

    const isSender = message.senderId === currentUserId;
    const isOwner = member.role === 'owner';
    const isAdmin = member.role === 'admin';

    if (!isSender && !isOwner && !isAdmin) {
      throw new ForbiddenError('Only the sender, group owner, or admin can delete this message for everyone', 'PERMISSION_DENIED');
    }

    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    if (messageAge > DELETE_FOR_EVERYONE_WINDOW_MS) {
      throw new ForbiddenError('Messages can only be deleted for everyone within 2 minutes of sending', 'DELETE_WINDOW_EXPIRED');
    }

    if (message.audit?.deletionScope === 'everyone') {
      throw new BadRequestError('Message already deleted for everyone', 'ALREADY_DELETED');
    }

    if (message.attachments && message.attachments.length > 0) {
      for (const attachment of message.attachments) {
        if (attachment.publicId) {
          deleteResource(attachment.publicId, attachment.type === 'document' ? 'raw' : (attachment.type === 'audio' || attachment.type === 'video' ? 'video' : 'image')).catch(() => {});
        }
      }
    }

    await prisma.attachment.deleteMany({ where: { messageId: id } });

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        isDeleted: true,
        content: '[This message was deleted]',
        audit: {
          update: {
            deletedAt: new Date(),
            deletedById: currentUserId,
            deletionScope: 'everyone'
          }
        }
      },
      include: messageInclude
    });

    try {
      const io = getIO();
      io.to(`conversation:${updatedMessage.conversationId}`).emit(SOCKET_EVENTS.MESSAGE_DELETED, {
        messageId: updatedMessage.id,
        conversationId: updatedMessage.conversationId,
        deletionScope: 'everyone',
        deletedBy: currentUserId,
      });
    } catch {
      // Ignore if socket IO server is not booted in test mode
    }

    res.status(200).json(
      createApiResponse(true, { message: updatedMessage, info: 'Message deleted for everyone' })
    );
  } catch (error) {
    next(error);
  }
}

export async function pinMessage(req, res, next) {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id || req.user.id;

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

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        isPinned: true,
        pinnedAt: new Date(),
        pinnedById: currentUserId
      },
      include: messageInclude
    });

    try {
      const io = getIO();
      io.to(`conversation:${conversation.id}`).emit(SOCKET_EVENTS.MESSAGE_PINNED, {
        messageId: updatedMessage.id,
        conversationId: conversation.id,
        pinnedBy: currentUserId,
      });
    } catch {
      // Ignore if socket IO server is not booted in test mode
    }

    res.status(200).json(createApiResponse(true, { message: updatedMessage, info: 'Message pinned' }));
  } catch (error) {
    next(error);
  }
}

export async function unpinMessage(req, res, next) {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id || req.user.id;

    const { message, conversation, member } = await verifyMessageAccess(id, currentUserId);

    const isPinner = message.pinnedById === currentUserId;
    const isOwner = member.role === 'owner';
    const isAdmin = member.role === 'admin';

    if (!isPinner && !isOwner && !isAdmin) {
      throw new ForbiddenError('Only the pinner, owner, or admin can unpin this message', 'PERMISSION_DENIED');
    }

    if (!message.isPinned) {
      throw new BadRequestError('Message is not pinned', 'NOT_PINNED');
    }

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        isPinned: false,
        pinnedAt: null,
        pinnedById: null
      },
      include: messageInclude
    });

    try {
      const io = getIO();
      io.to(`conversation:${conversation.id}`).emit(SOCKET_EVENTS.MESSAGE_UNPINNED, {
        messageId: updatedMessage.id,
        conversationId: conversation.id,
        unpinnedBy: currentUserId,
      });
    } catch {
      // Ignore if socket IO server is not booted in test mode
    }

    res.status(200).json(createApiResponse(true, { message: updatedMessage, info: 'Message unpinned' }));
  } catch (error) {
    next(error);
  }
}

export async function addReaction(req, res, next) {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id || req.user.id;
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== 'string' || emoji.length > 2) {
      throw new BadRequestError('Valid emoji is required', 'INVALID_EMOJI');
    }

    const { message, conversation } = await verifyMessageAccess(id, currentUserId);

    if (message.isDeleted) {
      throw new ForbiddenError('Cannot react to a deleted message', 'MESSAGE_DELETED');
    }

    const existingReaction = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId: id,
          userId: currentUserId,
          emoji
        }
      }
    });

    if (existingReaction) {
      await prisma.reaction.delete({ where: { id: existingReaction.id } });
    } else {
      await prisma.reaction.create({
        data: {
          messageId: id,
          userId: currentUserId,
          emoji
        }
      });
    }

    const updatedMessage = await prisma.message.findUnique({
      where: { id },
      include: messageInclude
    });

    try {
      const io = getIO();
      io.to(`conversation:${conversation.id}`).emit(
        existingReaction ? SOCKET_EVENTS.MESSAGE_REACTION_REMOVED : SOCKET_EVENTS.MESSAGE_REACTION_ADDED,
        {
          messageId: updatedMessage.id,
          conversationId: conversation.id,
          emoji,
          userId: currentUserId,
          action: existingReaction ? 'removed' : 'added',
        }
      );
    } catch {
      // Ignore if socket IO server is not booted in test mode
    }

    if (!existingReaction && updatedMessage.senderId !== currentUserId) {
      triggerNotification({
        recipientId: updatedMessage.senderId,
        actorId: currentUserId,
        type: 'message_reaction',
        entityId: updatedMessage.id,
        entityModel: 'Message',
        content: `reacted ${emoji} to your message`,
      }).catch(console.error);
    }

    res.status(200).json(createApiResponse(true, { message: updatedMessage, action: existingReaction ? 'removed' : 'added' }));
  } catch (error) {
    next(error);
  }
}

export async function removeReaction(req, res, next) {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id || req.user.id;
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== 'string') {
      throw new BadRequestError('Emoji is required', 'INVALID_EMOJI');
    }

    const { message, conversation } = await verifyMessageAccess(id, currentUserId);

    const existingReaction = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId: id,
          userId: currentUserId,
          emoji
        }
      }
    });

    if (!existingReaction) {
      throw new BadRequestError('No such reaction found', 'REACTION_NOT_FOUND');
    }

    await prisma.reaction.delete({ where: { id: existingReaction.id } });

    const updatedMessage = await prisma.message.findUnique({
      where: { id },
      include: messageInclude
    });

    try {
      const io = getIO();
      io.to(`conversation:${conversation.id}`).emit(SOCKET_EVENTS.MESSAGE_REACTION_REMOVED, {
        messageId: updatedMessage.id,
        conversationId: conversation.id,
        emoji,
        userId: currentUserId,
      });
    } catch {
      // Ignore if socket IO server is not booted in test mode
    }

    res.status(200).json(createApiResponse(true, { message: updatedMessage, info: 'Reaction removed' }));
  } catch (error) {
    next(error);
  }
}

// POST /api/v1/messages/:id/forward — Forward Message
export async function forwardMessage(req, res, next) {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id || req.user.id;
    const { conversationId } = req.body;

    if (!conversationId) {
      throw new BadRequestError('Conversation ID is required', 'CONVERSATION_ID_REQUIRED');
    }

    const sourceMessage = await prisma.message.findUnique({
      where: { id },
      include: { attachments: true }
    });

    if (!sourceMessage) {
      throw new NotFoundError('Message not found', 'MESSAGE_NOT_FOUND');
    }

    if (sourceMessage.isDeleted) {
      throw new ForbiddenError('Cannot forward a deleted message', 'MESSAGE_DELETED');
    }

    const targetConversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true }
    });

    if (!targetConversation) {
      throw new NotFoundError('Target conversation not found', 'CONVERSATION_NOT_FOUND');
    }

    const targetMember = targetConversation.members.find((m) => m.userId === currentUserId);
    if (!targetMember) {
      throw new ForbiddenError('You are not a member of the target conversation', 'NOT_A_MEMBER');
    }

    const now = new Date();

    const forwardedMessage = await prisma.message.create({
      data: {
        conversationId,
        senderId: currentUserId,
        content: sourceMessage.content || '',
        forwardedFromId: sourceMessage.id,
        attachments: {
          create: sourceMessage.attachments.map(a => ({
            url: a.url,
            publicId: a.publicId || "",
            type: a.type,
            filename: a.filename,
            size: a.size,
            duration: a.duration || null,
            width: a.width || null,
            height: a.height || null
          }))
        },
        readBy: {
          create: { userId: currentUserId, readAt: now }
        },
        audit: {
          create: { createdById: currentUserId }
        }
      },
      include: messageInclude
    });

    await prisma.$transaction([
      prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageId: forwardedMessage.id,
          updatedAt: now
        }
      }),
      prisma.conversationMember.update({
        where: { userId_conversationId: { userId: currentUserId, conversationId } },
        data: {
          lastReadAt: now,
          lastDeliveredAt: now
        }
      })
    ]);

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