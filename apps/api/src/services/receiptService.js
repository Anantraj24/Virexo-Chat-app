import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { SOCKET_EVENTS } from '@virexo/shared';
import { getIO } from '../socket/socketServer.js';

export async function markDelivered(conversationId, userId, messageId) {
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return null;

    const member = conversation.members.find((m) => m.userId.toString() === userId.toString());
    if (!member) return null;

    let targetDate = new Date();
    if (messageId) {
      const msg = await Message.findById(messageId);
      if (msg) targetDate = msg.createdAt;
    }

    // Idempotent check: set lastDeliveredAt to max date
    if (!member.lastDeliveredAt || targetDate > member.lastDeliveredAt) {
      member.lastDeliveredAt = targetDate;
      await conversation.save();
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
    const [conversation, user] = await Promise.all([
      Conversation.findById(conversationId),
      User.findById(userId),
    ]);

    if (!conversation || !user) return null;

    const member = conversation.members.find((m) => m.userId.toString() === userId.toString());
    if (!member) return null;

    const now = new Date();
    member.lastReadAt = now;
    member.lastDeliveredAt = now;
    await conversation.save();

    // Calculate unread count for current user
    const unreadCount = await Message.countDocuments({
      conversationId,
      senderId: { $ne: userId },
      createdAt: { $gt: member.lastReadAt },
      isDeleted: false,
    });

    try {
      const io = getIO();

      // Emit updated unread count to user's personal room
      io.to(`user:${userId}`).emit(SOCKET_EVENTS.UNREAD_UPDATE, {
        conversationId,
        unreadCount,
      });

      // Privacy check: only broadcast read receipt if user's setting allows it
      const privacySetting = user.privacySettings?.readReceipts || 'everyone';
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
    const conversations = await Conversation.find({ 'members.userId': userId });
    const syncData = {};

    for (const conv of conversations) {
      const member = conv.members.find((m) => m.userId.toString() === userId.toString());
      if (!member) continue;

      const unreadCount = await Message.countDocuments({
        conversationId: conv._id,
        senderId: { $ne: userId },
        createdAt: { $gt: member.lastReadAt || new Date(0) },
        isDeleted: false,
      });

      syncData[conv._id.toString()] = {
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
