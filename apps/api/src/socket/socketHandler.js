import { SOCKET_EVENTS } from '@virexo/shared';
import { Conversation } from '../models/Conversation.js';
import { presenceManager } from './presenceManager.js';

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

  // 5. Typing start event with auto-expiry timer (5s)
  socket.on(SOCKET_EVENTS.TYPING_START, ({ conversationId }) => {
    if (!conversationId) return;

    const timerKey = `${conversationId}:${userId}`;

    // Clear existing timer if any
    if (typingTimers.has(timerKey)) {
      clearTimeout(typingTimers.get(timerKey));
    }

    // Broadcast typing indicator to conversation room excluding sender
    socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.TYPING_INDICATOR, {
      conversationId,
      userId,
      username: user.displayName || user.username,
      isTyping: true,
    });

    // Set 5s auto-expiry timer
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

  // 6. Typing stop event
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

  // 7. Disconnect cleanup
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
