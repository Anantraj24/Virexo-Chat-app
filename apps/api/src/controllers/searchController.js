import prisma from '../config/prisma.js';
import { createApiResponse } from '@virexo/shared';
import { BadRequestError } from '../utils/errors.js';

// Helper to sanitize public user profile (same as userController)
function formatPublicProfile(user) {
  const obj = { ...user };
  delete obj.passwordHash;
  delete obj.emailVerificationToken;
  delete obj.emailVerificationExpires;
  delete obj.lastVerificationSentAt;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.email;
  delete obj.privacySettings;
  delete obj.notificationSettings;

  const privacySettings = typeof user.privacySettings === 'string' ? JSON.parse(user.privacySettings) : user.privacySettings || {};
  if (privacySettings && !privacySettings.showOnlineStatus) obj.status = 'offline';
  if (privacySettings && !privacySettings.showLastSeen) delete obj.lastSeen;
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
    const currentUserId = req.user.id || req.user.id;

    // Build query
    const where = {
      content: { contains: q, mode: 'insensitive' },
      isDeleted: false,
    };

    if (conversationId) {
      // Must also be a member of this conversation
      where.conversationId = conversationId;
      where.conversation = {
        members: {
          some: { userId: currentUserId }
        }
      };
    } else {
      // Must be a member of the conversation the message is in
      where.conversation = {
        members: {
          some: { userId: currentUserId }
        }
      };
    }

    if (senderId) where.senderId = senderId;
    
    if (attachmentType) {
      where.attachments = {
        some: { type: attachmentType }
      };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (cursor) {
      where.createdAt = { ...where.createdAt, lt: new Date(cursor) };
    }

    // Execute search (sort by createdAt descending)
    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: maxLimit,
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, status: true, role: true }
        },
        conversation: {
          select: { id: true, name: true, type: true }
        }
      }
    });

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

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: maxLimit
    });

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
    const currentUserId = req.user.id || req.user.id;

    if (!q) {
      throw new BadRequestError('Search query (q) is required');
    }

    const maxLimit = Math.min(parseInt(limit, 10) || 20, 50);

    const conversations = await prisma.conversation.findMany({
      where: {
        members: {
          some: { userId: currentUserId }
        },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } }
        ]
      },
      take: maxLimit,
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, displayName: true, avatarUrl: true, status: true, role: true }
            }
          }
        }
      }
    });

    res.status(200).json(createApiResponse(true, { conversations }));
  } catch (error) {
    next(error);
  }
}
