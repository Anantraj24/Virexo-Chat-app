import { SOCKET_EVENTS } from '@virexo/shared';
import prisma from '../config/prisma.js';
import { presenceManager } from './presenceManager.js';
import { markDelivered, markRead, syncReceiptsForUser } from '../services/receiptService.js';

const typingTimers = new Map();

export function setupSocketHandlers(io, socket) {
  const userId = socket.userId;
  const user = socket.user;

  socket.join(`user:${userId}`);

  const { isFirstTab } = presenceManager.trackConnect(userId, socket.id);
  if (isFirstTab) {
    presenceManager.updateUserStatusThrottled(userId, 'online');
    io.emit(SOCKET_EVENTS.USER_PRESENCE, {
      userId,
      username: user.username,
      status: 'online',
      timestamp: new Date().toISOString(),
    });
  }

  socket.on(SOCKET_EVENTS.JOIN_CONVERSATION, async (data, ack) => {
    try {
      const conversationId = typeof data === 'string' ? data : data?.conversationId;
      if (!conversationId) {
        if (typeof ack === 'function') ack({ success: false, error: 'Conversation ID required' });
        return;
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { members: true }
      });
      
      if (!conversation) {
        if (typeof ack === 'function') ack({ success: false, error: 'Conversation not found' });
        return;
      }

      const isMember = conversation.members.some((m) => m.userId === userId);
      if (!isMember) {
        if (typeof ack === 'function') ack({ success: false, error: 'Not a member of conversation' });
        return;
      }

      socket.join(`conversation:${conversationId}`);
      if (typeof ack === 'function') ack({ success: true, conversationId });
    } catch (err) {
      if (typeof ack === 'function') ack({ success: false, error: err.message });
    }
  });

  socket.on(SOCKET_EVENTS.LEAVE_CONVERSATION, (data, ack) => {
    const conversationId = typeof data === 'string' ? data : data?.conversationId;
    if (conversationId) {
      socket.leave(`conversation:${conversationId}`);
    }
    if (typeof ack === 'function') ack({ success: true });
  });

  socket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, async ({ conversationId, messageId }) => {
    if (!conversationId) return;
    await markDelivered(conversationId, userId, messageId);
  });

  socket.on(SOCKET_EVENTS.MESSAGE_READ, async ({ conversationId }) => {
    if (!conversationId) return;
    await markRead(conversationId, userId);
  });

  socket.on(SOCKET_EVENTS.RECEIPTS_SYNC, async (ack) => {
    const syncData = await syncReceiptsForUser(userId);
    if (typeof ack === 'function') ack({ success: true, syncData });
  });

  socket.on(SOCKET_EVENTS.TYPING_START, ({ conversationId }) => {
    if (!conversationId) return;

    const timerKey = `${conversationId}:${userId}`;

    if (typingTimers.has(timerKey)) {
      clearTimeout(typingTimers.get(timerKey));
    }

    socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.TYPING_INDICATOR, {
      conversationId,
      userId,
      username: user.displayName || user.username,
      isTyping: true,
    });

    const timer = setTimeout(() => {
      typingTimers.delete(timerKey);
      socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.TYPING_INDICATOR, {
        conversationId,
        userId,
        username: user.displayName || user.username,
        isTyping: false,
      });
    }, 5000);

    typingTimers.set(timerKey, timer);
  });

  socket.on(SOCKET_EVENTS.TYPING_STOP, ({ conversationId }) => {
    if (!conversationId) return;

    const timerKey = `${conversationId}:${userId}`;
    if (typingTimers.has(timerKey)) {
      clearTimeout(typingTimers.get(timerKey));
      typingTimers.delete(timerKey);
    }

    socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.TYPING_INDICATOR, {
      conversationId,
      userId,
      username: user.displayName || user.username,
      isTyping: false,
    });
  });

  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    const { isLastTab } = presenceManager.trackDisconnect(userId, socket.id);
    if (isLastTab) {
      const now = new Date();
      presenceManager.updateUserStatusThrottled(userId, 'offline');
      io.emit(SOCKET_EVENTS.USER_PRESENCE, {
        userId,
        username: user.username,
        status: 'offline',
        lastSeen: now.toISOString(),
      });
    }
  });
}