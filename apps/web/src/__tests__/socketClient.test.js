import { describe, it, expect, beforeEach } from 'vitest';
import { useSocketStore } from '../store/useSocketStore';

describe('Real-Time Socket Store', () => {
  beforeEach(() => {
    useSocketStore.setState({
      connected: false,
      onlineUsers: {},
      typingIndicators: {},
    });
  });

  it('should update presence status for users', () => {
    useSocketStore.getState().updateUserPresence({ userId: 'u1', status: 'online' });
    expect(useSocketStore.getState().onlineUsers.u1).toBe('online');

    useSocketStore.getState().updateUserPresence({ userId: 'u1', status: 'offline' });
    expect(useSocketStore.getState().onlineUsers.u1).toBe('offline');
  });

  it('should track and clear typing indicators per conversation', () => {
    useSocketStore.getState().setTypingIndicator({
      conversationId: 'c1',
      userId: 'u1',
      username: 'alex',
      isTyping: true,
    });

    let typingUsers = useSocketStore.getState().getTypingUsersForConversation('c1');
    expect(typingUsers).toEqual(['alex']);

    // Stop typing
    useSocketStore.getState().setTypingIndicator({
      conversationId: 'c1',
      userId: 'u1',
      username: 'alex',
      isTyping: false,
    });

    typingUsers = useSocketStore.getState().getTypingUsersForConversation('c1');
    expect(typingUsers).toEqual([]);
  });
});
