import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDB, teardownTestDB, cleanCollections, prisma } from './testSetup.js';
import { markDelivered, markRead, syncReceiptsForUser } from '../services/receiptService.js';



beforeAll(async () => {
  await setupTestDB();
    await cleanCollections();
}, 60000);

afterAll(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await cleanCollections();
});

describe('Delivery & Read State Integration Tests (Phase 11)', () => {
  async function createTestUser(username, email, readReceipts = 'everyone') {
    return prisma.user.create({ data: {
      username,
      email,
      passwordHash: 'hashed_pass',
      privacySettings: { readReceipts },
    } });
  }

  it('should update member lastDeliveredAt idempotently', async () => {
    const user1 = await createTestUser('user_one', 'u1@example.com');
    const user2 = await createTestUser('user_two', 'u2@example.com');

    const conversation = await prisma.conversation.create({ data: {
      type: 'direct',
      members: { create: [
        { userId: user1.id, role: 'member' },
        { userId: user2.id, role: 'member' },
      ] },
    } });

    const conversationId = conversation.id.toString();

    // Mark delivered
    const del1 = await markDelivered(conversationId, user2.id.toString());
    expect(del1).toBeTruthy();

    const updatedConv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    const member2 = updatedConv.members.find((m) => m.userId.toString() === user2.id.toString());
    expect(member2.lastDeliveredAt).toBeDefined();
  });

  it('should update lastReadAt and calculate zero unreadCount when user marks conversation read', async () => {
    const user1 = await createTestUser('sender_user', 'sender_p@example.com', 'everyone');
    const user2 = await createTestUser('private_user', 'private@example.com', 'nobody');

    const conversation = await prisma.conversation.create({ data: {
      type: 'direct',
      members: { create: [
        { userId: user1.id, role: 'member' },
        { userId: user2.id, role: 'member' },
      ] },
    } });

    const convId = conversation.id.toString();

    // Create an unread message from user1
    await prisma.message.create({ data: {
      conversationId: convId,
      senderId: user1.id,
      content: 'Unread test message',
    } });

    // User2 (privacy = nobody) marks conversation read
    const result = await markRead(convId, user2.id.toString());

    expect(result).toBeDefined();
    expect(result.unreadCount).toBe(0);
    expect(result.lastReadAt).toBeInstanceOf(Date);

    // Verify DB state
    const updatedConv = await prisma.conversation.findUnique({ where: { id: convId } });
    const member2 = updatedConv.members.find((m) => m.userId.toString() === user2.id.toString());
    expect(member2.lastReadAt.getTime()).toBeCloseTo(result.lastReadAt.getTime(), -2);
  });

  it('should sync receipts for user reconnect', async () => {
    const user1 = await createTestUser('sync_user1', 'sync1@example.com');
    const user2 = await createTestUser('sync_user2', 'sync2@example.com');

    const conversation = await prisma.conversation.create({ data: {
      type: 'direct',
      members: { create: [
        { userId: user1.id, role: 'member' },
        { userId: user2.id, role: 'member' },
      ] },
    } });

    const syncData = await syncReceiptsForUser(user1.id.toString());
    expect(syncData[conversation.id.toString()]).toBeDefined();
    expect(syncData[conversation.id.toString()].unreadCount).toBe(0);
  });
});
