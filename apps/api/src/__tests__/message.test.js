import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { setupTestDB, teardownTestDB, cleanCollections, prisma } from './testSetup.js';



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

describe('Message REST Domain API Integration Tests', () => {
  async function createTestUser(username, email) {
    const signupRes = await request(app).post('/api/v1/auth/signup').send({
      username,
      email,
      password: 'Password123!',
    });
    return {
      user: signupRes.body.data.user,
      token: signupRes.body.data.accessToken,
    };
  }

  it('POST /api/v1/messages should create a text message and update conversation lastMessageId', async () => {
    const user1 = await createTestUser('sender_u', 'sender@example.com');
    const user2 = await createTestUser('recipient_u', 'recipient@example.com');

    // Create DM
    const convRes = await request(app)
      .post('/api/v1/conversations/direct')
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ recipientId: user2.user.id });

    const conversationId = convRes.body.data.conversation.id;

    // Send Message
    const msgRes = await request(app)
      .post('/api/v1/messages')
      .set('Authorization', `Bearer ${user1.token}`)
      .send({
        conversationId,
        content: 'Hello World from Virexo!',
        idempotencyKey: 'key_12345',
      });

    expect(msgRes.status).toBe(201);
    expect(msgRes.body.success).toBe(true);
    expect(msgRes.body.data.message.content).toBe('Hello World from Virexo!');
    expect(msgRes.body.data.message.sender?.username || msgRes.body.data.message.senderId?.username).toBe('sender_u');

    // Verify Conversation updated lastMessageId
    const updatedConv = await prisma.conversation.findUnique({ where: { id: conversationId } });
    expect(updatedConv.lastMessageId.toString()).toBe(msgRes.body.data.message.id);
  });

  it('POST /api/v1/messages should enforce idempotency key deduplication', async () => {
    const user1 = await createTestUser('user_a', 'usera@example.com');
    const user2 = await createTestUser('user_b', 'userb@example.com');

    const convRes = await request(app)
      .post('/api/v1/conversations/direct')
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ recipientId: user2.user.id });

    const conversationId = convRes.body.data.conversation.id;

    // Send initial message with idempotency key
    const msgRes1 = await request(app)
      .post('/api/v1/messages')
      .set('Authorization', `Bearer ${user1.token}`)
      .send({
        conversationId,
        content: 'Idempotent Message',
        idempotencyKey: 'idempotent_key_abc',
      });

    expect(msgRes1.status).toBe(201);

    // Retry exact same request
    const msgRes2 = await request(app)
      .post('/api/v1/messages')
      .set('Authorization', `Bearer ${user1.token}`)
      .send({
        conversationId,
        content: 'Idempotent Message',
        idempotencyKey: 'idempotent_key_abc',
      });

    expect(msgRes2.status).toBe(200);
    expect(msgRes2.body.data.isExisting).toBe(true);
    expect(msgRes2.body.data.message.id).toBe(msgRes1.body.data.message.id);

    // Verify DB count is 1
    const count = await prisma.message.count();
    expect(count).toBe(1);
  });

  it('GET /api/v1/messages/conversation/:id should return cursor pagination & unread count', async () => {
    const user1 = await createTestUser('user_1', 'user1@example.com');
    const user2 = await createTestUser('user_2', 'user2@example.com');

    const convRes = await request(app)
      .post('/api/v1/conversations/direct')
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ recipientId: user2.user.id });

    const conversationId = convRes.body.data.conversation.id;

    // Send 3 messages from user1
    for (let i = 1; i <= 3; i++) {
      await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ conversationId, content: `Message ${i}` });
    }

    // User2 checks history
    const historyRes = await request(app)
      .get(`/api/v1/messages/conversation/${conversationId}?limit=2`)
      .set('Authorization', `Bearer ${user2.token}`);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.messages.length).toBe(2);
    expect(historyRes.body.data.unreadCount).toBe(3); // User2 hasn't read them yet
  }, 25000);

  it('DELETE /api/v1/messages/:id should soft delete message', async () => {
    const user1 = await createTestUser('author_user', 'author@example.com');
    const user2 = await createTestUser('reader_user', 'reader@example.com');

    const convRes = await request(app)
      .post('/api/v1/conversations/direct')
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ recipientId: user2.user.id });

    const conversationId = convRes.body.data.conversation.id;

    const msgRes = await request(app)
      .post('/api/v1/messages')
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ conversationId, content: 'Sensitive info' });

    const messageId = msgRes.body.data.message.id;

    // Delete message
    const deleteRes = await request(app)
      .delete(`/api/v1/messages/${messageId}`)
      .set('Authorization', `Bearer ${user1.token}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.data.message.isDeleted).toBe(true);
    expect(deleteRes.body.data.message.content).toBe('[This message was deleted]');
  });
});
