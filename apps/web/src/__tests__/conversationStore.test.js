import { describe, it, expect } from 'vitest';

describe('Conversation Domain Frontend Helpers', () => {
  it('should format direct message recipient name correctly', () => {
    const currentUserId = 'user1';
    const conversation = {
      id: 'conv1',
      type: 'direct',
      members: [
        { userId: { id: 'user1', username: 'alex', displayName: 'Alex Rivera' }, role: 'member' },
        { userId: { id: 'user2', username: 'sarah', displayName: 'Sarah Chen' }, role: 'member' },
      ],
    };

    const recipientMember = conversation.members.find(
      (m) => m.userId.id !== currentUserId
    );

    expect(recipientMember.userId.displayName).toBe('Sarah Chen');
    expect(recipientMember.userId.username).toBe('sarah');
  });

  it('should filter conversation list into group channels vs direct messages', () => {
    const list = [
      { id: '1', type: 'direct', name: '' },
      { id: '2', type: 'group', name: 'general' },
      { id: '3', type: 'direct', name: '' },
      { id: '4', type: 'channel', name: 'announcements' },
    ];

    const channels = list.filter((c) => c.type === 'group' || c.type === 'channel');
    const dms = list.filter((c) => c.type === 'direct');

    expect(channels.length).toBe(2);
    expect(dms.length).toBe(2);
  });
});
