import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../store/useAuthStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it('should initialize with default unauthenticated state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it('setAuth should set user, accessToken, and isAuthenticated=true in memory', () => {
    const mockUser = { id: '1', username: 'alex', email: 'alex@example.com' };
    const mockToken = 'jwt_access_token_123';

    useAuthStore.getState().setAuth(mockUser, mockToken);

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe(mockToken);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isInitializing).toBe(false);
  });

  it('getAccessToken should return in-memory token', () => {
    const mockToken = 'token_xyz';
    useAuthStore.getState().setAuth({ username: 'test' }, mockToken);

    expect(useAuthStore.getState().getAccessToken()).toBe(mockToken);
  });

  it('setUser should update user object without clearing token', () => {
    useAuthStore.getState().setAuth({ username: 'old_name' }, 'my_token');

    useAuthStore.getState().setUser({ username: 'new_name' });

    const state = useAuthStore.getState();
    expect(state.user.username).toBe('new_name');
    expect(state.accessToken).toBe('my_token');
  });

  it('clearAuth should reset user, token, and isAuthenticated', () => {
    useAuthStore.getState().setAuth({ username: 'alex' }, 'token');
    useAuthStore.getState().clearAuth();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isInitializing).toBe(false);
  });
});
