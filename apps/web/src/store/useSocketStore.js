import { create } from 'zustand';

export const useSocketStore = create((set, get) => ({
  connected: false,
  onlineUsers: {}, // userId -> 'online' | 'offline'
  typingIndicators: {}, // conversationId -> Map<userId, username>
  unreadCounts: {}, // conversationId -> count
  receipts: {}, // conversationId -> { members: [{ userId, lastReadAt, lastDeliveredAt }] }

  setConnected: (connected) => set({ connected }),

  updateUserPresence: ({ userId, status }) => {
    set((state) => ({
      onlineUsers: {
        ...state.onlineUsers,
        [userId]: status,
      },
    }));
  },

  setTypingIndicator: ({ conversationId, userId, username, isTyping }) => {
    set((state) => {
      const currentConvTyping = { ...(state.typingIndicators[conversationId] || {}) };

      if (isTyping) {
        currentConvTyping[userId] = username;
      } else {
        delete currentConvTyping[userId];
      }

      return {
        typingIndicators: {
          ...state.typingIndicators,
          [conversationId]: currentConvTyping,
        },
      };
    });
  },

  setUnreadCount: (conversationId, count) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [conversationId]: count,
      },
    }));
  },

  updateReceipt: ({ conversationId, userId, status, lastReadAt, lastDeliveredAt }) => {
    set((state) => {
      const currentReceipt = state.receipts[conversationId] || { members: [] };
      const updatedMembers = [...currentReceipt.members];

      const idx = updatedMembers.findIndex((m) => (m.userId.id || m.userId).toString() === userId.toString());
      if (idx >= 0) {
        updatedMembers[idx] = {
          ...updatedMembers[idx],
          ...(lastReadAt ? { lastReadAt } : {}),
          ...(lastDeliveredAt ? { lastDeliveredAt } : {}),
          status,
        };
      } else {
        updatedMembers.push({
          userId,
          lastReadAt,
          lastDeliveredAt,
          status,
        });
      }

      return {
        receipts: {
          ...state.receipts,
          [conversationId]: { members: updatedMembers },
        },
      };
    });
  },

  syncReceiptState: (syncData) => {
    const unreadMap = {};
    const receiptsMap = {};

    Object.entries(syncData).forEach(([convId, data]) => {
      unreadMap[convId] = data.unreadCount || 0;
      receiptsMap[convId] = { members: data.members || [] };
    });

    set({
      unreadCounts: unreadMap,
      receipts: receiptsMap,
    });
  },

  getTypingUsersForConversation: (conversationId) => {
    const map = get().typingIndicators[conversationId] || {};
    return Object.values(map);
  },
}));
