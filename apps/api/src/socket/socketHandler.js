import { SOCKET_EVENTS } from '@virexo/shared';
import { Conversation } from '../models/Conversation.js';
import { presenceManager } from './presenceManager.js';
import { markDelivered, markRead, syncReceiptsForUser } from '../services/receiptService.js';

// Map<string, NodeJS.Timeout> to track typing auto-expiry
const typingTimers = new Map();

export function setupSocketHandlers(io, socket) {
  const userId = socket.userId;
  const user = socket.user;

  // 1. Join personal user room
  socket.join(`user:${userId}`);

  // 2. Track connection & Presence (0 -> 1 transition)
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

  // 3. Handle conversation room join with authorization check
  socket.on(SOCKET_EVENTS.JOIN_CONVERSATION, async (data, ack) => {
    try {
      const conversationId = typeof data === 'string' ? data : data?.conversationId;
      if (!conversationId) {
        if (typeof ack === 'function') ack({ success: false, error: 'Conversation ID required' });
        return;
      }

      // Verify conversation membership
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        if (typeof ack === 'function') ack({ success: false, error: 'Conversation not found' });
        return;
      }

      const isMember = conversation.members.some((m) => m.userId.toString() === userId);
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

  // 4. Handle conversation room leave
  socket.on(SOCKET_EVENTS.LEAVE_CONVERSATION, (data, ack) => {
    const conversationId = typeof data === 'string' ? data : data?.conversationId;
    if (conversationId) {
      socket.leave(`conversation:${conversationId}`);
    }
    if (typeof ack === 'function') ack({ success: true });
  });

  // 5. Receipt event: message:delivered
  socket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, async ({ conversationId, messageId }) => {
    if (!conversationId) return;
    await markDelivered(conversationId, userId, messageId);
  });

  // 6. Receipt event: message:read
  socket.on(SOCKET_EVENTS.MESSAGE_READ, async ({ conversationId }) => {
    if (!conversationId) return;
    await markRead(conversationId, userId);
  });

  // 7. Reconnect Synchronization: sync:receipts
  socket.on(SOCKET_EVENTS.RECEIPTS_SYNC, async (ack) => {
    const syncData = await syncReceiptsForUser(userId);
    if (typeof ack === 'function') ack({ success: true, syncData });
  });

  // 8. Typing start event with auto-expiry timer (5s)
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

  // 9. Typing stop event
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

  // 10. Disconnect cleanup
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
