import { describe, it, expect } from 'vitest';
import { useAuthStore } from '../store/useAuthStore';

describe('User Profile State Management', () => {
  it('should update user profile object in memory store', () => {
    const initialUser = {
      username: 'alex',
      displayName: '',
      bio: '',
      privacySettings: { showOnlineStatus: true },
    };

    useAuthStore.getState().setAuth(initialUser, 'fake_token');

    const updatedUser = {
      ...initialUser,
      displayName: 'Alex Rivera',
      bio: 'Building Virexo Chat',
      privacySettings: { showOnlineStatus: false },
    };

    useAuthStore.getState().setUser(updatedUser);

    const state = useAuthStore.getState();
    expect(state.user.displayName).toBe('Alex Rivera');
    expect(state.user.bio).toBe('Building Virexo Chat');
    expect(state.user.privacySettings.showOnlineStatus).toBe(false);
  });
});
