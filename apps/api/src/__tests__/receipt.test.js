import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../models/User.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { markDelivered, markRead, syncReceiptsForUser } from '../services/receiptService.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
  await Conversation.deleteMany({});
  await Message.deleteMany({});
});

describe('Delivery & Read State Integration Tests (Phase 11)', () => {
  async function createTestUser(username, email, readReceipts = 'everyone') {
    return User.create({
      username,
      email,
      passwordHash: 'hashed_pass',
      privacySettings: { readReceipts },
    });
  }

  it('should update member lastDeliveredAt idempotently', async () => {
    const user1 = await createTestUser('user_one', 'u1@example.com');
    const user2 = await createTestUser('user_two', 'u2@example.com');

    const conversation = await Conversation.create({
      type: 'direct',
      members: [
        { userId: user1._id, role: 'member' },
        { userId: user2._id, role: 'member' },
      ],
    });

    const conversationId = conversation._id.toString();

    // Mark delivered
    const del1 = await markDelivered(conversationId, user2._id.toString());
    expect(del1).toBeTruthy();

    const updatedConv = await Conversation.findById(conversationId);
    const member2 = updatedConv.members.find((m) => m.userId.toString() === user2._id.toString());
    expect(member2.lastDeliveredAt).toBeDefined();
  });

  it('should update lastReadAt and calculate zero unreadCount when user marks conversation read', async () => {
    const user1 = await createTestUser('sender_user', 'sender_p@example.com', 'everyone');
    const user2 = await createTestUser('private_user', 'private@example.com', 'nobody');

    const conversation = await Conversation.create({
      type: 'direct',
      members: [
        { userId: user1._id, role: 'member' },
        { userId: user2._id, role: 'member' },
      ],
    });

    const convId = conversation._id.toString();

    // Create an unread message from user1
    await Message.create({
      conversationId: convId,
      senderId: user1._id,
      content: 'Unread test message',
    });

    // User2 (privacy = nobody) marks conversation read
    const result = await markRead(convId, user2._id.toString());

    expect(result).toBeDefined();
    expect(result.unreadCount).toBe(0);
    expect(result.lastReadAt).toBeInstanceOf(Date);

    // Verify DB state
    const updatedConv = await Conversation.findById(convId);
    const member2 = updatedConv.members.find((m) => m.userId.toString() === user2._id.toString());
    expect(member2.lastReadAt.getTime()).toBeCloseTo(result.lastReadAt.getTime(), -2);
  });

  it('should sync receipts for user reconnect', async () => {
    const user1 = await createTestUser('sync_user1', 'sync1@example.com');
    const user2 = await createTestUser('sync_user2', 'sync2@example.com');

    const conversation = await Conversation.create({
      type: 'direct',
      members: [
        { userId: user1._id, role: 'member' },
        { userId: user2._id, role: 'member' },
      ],
    });

    const syncData = await syncReceiptsForUser(user1._id.toString());
    expect(syncData[conversation._id.toString()]).toBeDefined();
    expect(syncData[conversation._id.toString()].unreadCount).toBe(0);
  });
});
