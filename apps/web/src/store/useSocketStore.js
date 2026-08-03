import { create } from 'zustand';

export const useSocketStore = create((set, get) => ({
  connected: false,
  onlineUsers: {}, // userId -> status ('online' | 'offline')
  typingIndicators: {}, // conversationId -> Map<userId, username>

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

  getTypingUsersForConversation: (conversationId) => {
    const map = get().typingIndicators[conversationId] || {};
    return Object.values(map);
  },
}));
