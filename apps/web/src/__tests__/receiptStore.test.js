import { describe, it, expect, beforeEach } from 'vitest';
import { useSocketStore } from '../store/useSocketStore';

describe('Receipt Store & Sync Helpers', () => {
  beforeEach(() => {
    useSocketStore.setState({
      connected: false,
      onlineUsers: {},
      typingIndicators: {},
      unreadCounts: {},
      receipts: {},
    });
  });

  it('should update unread count for conversation', () => {
    useSocketStore.getState().setUnreadCount('conv_1', 5);
    expect(useSocketStore.getState().unreadCounts.conv_1).toBe(5);
  });

  it('should update member receipt status', () => {
    useSocketStore.getState().updateReceipt({
      conversationId: 'conv_1',
      userId: 'user_1',
      status: 'read',
      lastReadAt: '2026-08-03T15:45:00.000Z',
    });

    const receipts = useSocketStore.getState().receipts.conv_1;
    expect(receipts).toBeDefined();
    expect(receipts.members.length).toBe(1);
    expect(receipts.members[0].status).toBe('read');
  });

  it('should synchronize receipt state on reconnect', () => {
    const syncData = {
      conv_100: {
        unreadCount: 3,
        members: [{ userId: 'u1', lastReadAt: '2026-08-03T15:00:00.000Z' }],
      },
    };

    useSocketStore.getState().syncReceiptState(syncData);
    expect(useSocketStore.getState().unreadCounts.conv_100).toBe(3);
    expect(useSocketStore.getState().receipts.conv_100.members.length).toBe(1);
  });
});
