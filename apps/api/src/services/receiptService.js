import prisma from '../config/prisma.js';
import { SOCKET_EVENTS } from '@virexo/shared';
import { getIO } from '../socket/socketServer.js';

export async function markDelivered(conversationId, userId, messageId) {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true }
    });
    
    if (!conversation) return null;

    const member = conversation.members.find((m) => m.userId === userId);
    if (!member) return null;

    let targetDate = new Date();
    if (messageId) {
      const msg = await prisma.message.findUnique({ where: { id: messageId } });
      if (msg) targetDate = msg.createdAt;
    }

    // Idempotent check: set lastDeliveredAt to max date
    if (!member.lastDeliveredAt || targetDate > member.lastDeliveredAt) {
      member.lastDeliveredAt = targetDate;
      await prisma.conversationMember.update({
        where: { userId_conversationId: { userId, conversationId } },
        data: { lastDeliveredAt: targetDate }
      });
    }

    // Broadcast delivery receipt to conversation room
    try {
      const io = getIO();
      io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.RECEIPT_UPDATE, {
        conversationId,
        userId,
        status: 'delivered',
        lastDeliveredAt: member.lastDeliveredAt.toISOString(),
      });
    } catch {
      // Ignore if socket IO server is not booted in test mode
    }

    return member.lastDeliveredAt;
  } catch {
    return null;
  }
}

export async function markRead(conversationId, userId) {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true }
    });
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!conversation || !user) return null;

    const member = conversation.members.find((m) => m.userId === userId);
    if (!member) return null;

    const now = new Date();
    
    await prisma.conversationMember.update({
      where: { userId_conversationId: { userId, conversationId } },
      data: {
        lastReadAt: now,
        lastDeliveredAt: now
      }
    });

    // Calculate unread count for current user
    const unreadCount = await prisma.message.count({
      where: {
        conversationId,
        senderId: { not: userId },
        createdAt: { gt: now },
        isDeleted: false,
      }
    });

    try {
      const io = getIO();

      // Emit updated unread count to user's personal room
      io.to(`user:${userId}`).emit(SOCKET_EVENTS.UNREAD_UPDATE, {
        conversationId,
        unreadCount,
      });

      // Privacy check: only broadcast read receipt if user's setting allows it
      let privacySetting = 'everyone';
      if (user.privacySettings) {
        const ps = typeof user.privacySettings === 'string' ? JSON.parse(user.privacySettings) : user.privacySettings;
        if (ps.readReceipts) privacySetting = ps.readReceipts;
      }
      
      if (privacySetting !== 'nobody') {
        io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.RECEIPT_UPDATE, {
          conversationId,
          userId,
          status: 'read',
          lastReadAt: now.toISOString(),
        });
      }
    } catch {
      // Ignore if socket IO server is not booted in test mode
    }

    return { lastReadAt: now, unreadCount };
  } catch {
    return null;
  }
}

export async function syncReceiptsForUser(userId) {
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        members: {
          some: { userId }
        }
      },
      include: { members: true }
    });
    
    const syncData = {};

    for (const conv of conversations) {
      const member = conv.members.find((m) => m.userId === userId);
      if (!member) continue;

      const unreadCount = await prisma.message.count({
        where: {
          conversationId: conv.id,
          senderId: { not: userId },
          createdAt: { gt: member.lastReadAt || new Date(0) },
          isDeleted: false,
        }
      });

      syncData[conv.id] = {
        unreadCount,
        lastReadAt: member.lastReadAt,
        lastDeliveredAt: member.lastDeliveredAt,
        members: conv.members.map((m) => ({
          userId: m.userId,
          lastReadAt: m.lastReadAt,
          lastDeliveredAt: m.lastDeliveredAt,
        })),
      };
    }

    return syncData;
  } catch {
    return {};
  }
}
