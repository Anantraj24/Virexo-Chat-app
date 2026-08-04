import { create } from 'zustand';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  hasNextPage: false,
  nextCursor: null,

  setNotifications: (notifications) => set({ notifications }),
  
  addNotification: (notification) => set((state) => {
    // Prevent duplicate adds if already present (e.g. from race conditions)
    if (state.notifications.some(n => n._id === notification._id)) return state;
    return {
      notifications: [notification, ...state.notifications],
      unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1
    };
  }),

  setUnreadCount: (count) => set({ unreadCount: count }),
  
  incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  
  setPagination: ({ hasNextPage, nextCursor }) => set({ hasNextPage, nextCursor }),

  appendNotifications: (newNotifications) => set((state) => {
    const existingIds = new Set(state.notifications.map(n => n._id));
    const filtered = newNotifications.filter(n => !existingIds.has(n._id));
    return { notifications: [...state.notifications, ...filtered] };
  }),

  markAsReadLocally: (id) => set((state) => ({
    notifications: state.notifications.map(n => 
      n._id === id ? { ...n, isRead: true } : n
    ),
    unreadCount: Math.max(0, state.unreadCount - 1)
  })),

  markAllAsReadLocally: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, isRead: true })),
    unreadCount: 0
  })),

  clearNotifications: () => set({
    notifications: [],
    unreadCount: 0,
    hasNextPage: false,
    nextCursor: null
  })
}));
