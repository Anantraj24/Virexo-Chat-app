import { create } from 'zustand';

/**
 * Authentication store — in-memory only.
 * Access tokens are NEVER persisted to localStorage or sessionStorage.
 * Refresh tokens are managed as HttpOnly cookies by the browser.
 */
export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  isInitializing: true,

  // Derived getter — not reactive, use for interceptors
  getAccessToken: () => get().accessToken,

  isAuthenticated: false,

  setAuth: (user, accessToken) =>
    set({
      user,
      accessToken,
      isAuthenticated: true,
      isInitializing: false,
    }),

  setUser: (user) => set({ user }),

  clearAuth: () =>
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitializing: false,
    }),

  setInitializing: (isInitializing) => set({ isInitializing }),
}));
