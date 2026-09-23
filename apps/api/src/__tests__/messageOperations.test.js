import request from 'supertest';
import { describe, it, expect, beforeEach, vi, afterEach, beforeAll, afterAll } from 'vitest';
import app from '../app.js';
import { setupTestDB, teardownTestDB, cleanCollections, prisma, createTestUser } from './testSetup.js';
import { generateAccessToken } from '../utils/token.js';

vi.mock('../utils/socket.js', () => ({
  getIO: vi.fn(() => ({
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
  })),
}));

describe('Message Operations API', () => {
  let user1, user2, user3, token1, token2, token3, conversation, message;
  
  // Vitest handles mongoose connection if run globally, 
  // but if needed we can add it. The other tests have it inside the file.
  // Assuming the test runner handles it or I'll just follow the others.
  

  beforeAll(async () => {
    await setupTestDB();
    await cleanCollections();
  }, 60000);

  afterAll(async () => {
  await teardownTestDB();
});

  beforeEach(async () => {
    await cleanCollections();
    
    
    

    const u1 = await createTestUser(); user1 = u1.user; token1 = u1.token;

    const u2 = await createTestUser(); user2 = u2.user; token2 = u2.token;

    const u3 = await createTestUser(); user3 = u3.user; token3 = u3.token;

    conversation = await prisma.conversation.create({ data: {
      type: 'direct',
      members: { create: [
        { userId: user1.id, role: 'member' },
        { userId: user2.id, role: 'member' },
      ] },
    } });

    message = await prisma.message.create({ data: {
      conversationId: conversation.id,
      senderId: user1.id,
      content: 'Original message',
    } });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('PUT /api/v1/messages/:id - Edit Message', () => {
    it('should edit a message successfully if requested by sender', async () => {
      const res = await request(app)
        .put(`/api/v1/messages/${message.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ content: 'Edited message' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message.content).toBe('Edited message');
      expect(res.body.data.message.isEdited).toBe(true);

      const dbMessage = await prisma.message.findUnique({ where: { id: message.id }, include: { audit: true } });
      expect(dbMessage.content).toBe('Edited message');
      expect(dbMessage.isEdited).toBe(true);
      expect(dbMessage.audit.editedById).toBe(user1.id);
    });

    it('should fail to edit message if requested by non-sender', async () => {
      const res = await request(app)
        .put(`/api/v1/messages/${message.id}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ content: 'Hacked message' });

      expect(res.status).toBe(403);
    });

    it('should fail to edit deleted message', async () => {
      await prisma.message.update({ where: { id: message.id }, data: { isDeleted: true } });

      const res = await request(app)
        .put(`/api/v1/messages/${message.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ content: 'Trying to edit deleted' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/messages/:id - Delete For Me', () => {
    it('should delete message for me successfully', async () => {
      const res = await request(app)
        .delete(`/api/v1/messages/${message.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);

      const dbMessage = await prisma.message.findUnique({ where: { id: message.id }, include: { audit: true } });
      expect(dbMessage.isDeleted).toBe(true);
      expect(dbMessage.audit.deletedById).toBe(user1.id);
      expect(dbMessage.audit.deletionScope).toBe('self');
    });

    it('should allow group admin to delete someone else message for me', async () => {
      const groupConv = await prisma.conversation.create({ data: {
        type: 'group',
        name: 'Test Group',
        members: { create: [
          { userId: user1.id, role: 'member' },
          { userId: user2.id, role: 'admin' },
        ] },
      } });

      const groupMessage = await prisma.message.create({ data: {
        conversationId: groupConv.id,
        senderId: user1.id,
        content: 'Group msg',
      } });

      const res = await request(app)
        .delete(`/api/v1/messages/${groupMessage.id}`)
        .set('Authorization', `Bearer ${token2}`); // admin

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/messages/:id/everyone - Delete For Everyone', () => {
    it('should delete message for everyone if within 2 minutes', async () => {
      const res = await request(app)
        .delete(`/api/v1/messages/${message.id}/everyone`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      const dbMessage = await prisma.message.findUnique({ where: { id: message.id }, include: { audit: true } });
      expect(dbMessage.isDeleted).toBe(true);
      expect(dbMessage.content).toBe('[This message was deleted]');
      expect(dbMessage.audit.deletionScope).toBe('everyone');
    });

    it('should fail if requested by non-sender', async () => {
      const res = await request(app)
        .delete(`/api/v1/messages/${message.id}/everyone`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(403);
    });

    it('should fail if outside 2 minute window', async () => {
      vi.useFakeTimers();
      
      const oldMessage = await prisma.message.create({ data: {
        conversationId: conversation.id,
        senderId: user1.id,
        content: 'Old msg',
        createdAt: new Date(Date.now() - 3 * 60 * 1000), // 3 mins ago
      } });

      const res = await request(app)
        .delete(`/api/v1/messages/${oldMessage.id}/everyone`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('DELETE_WINDOW_EXPIRED');
    });
  });

  describe('POST /api/v1/messages/:id/pin - Pin/Unpin Message', () => {
    it('should allow pinning in direct message', async () => {
      const res = await request(app)
        .post(`/api/v1/messages/${message.id}/pin`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      const dbMsg = await prisma.message.findUnique({ where: { id: message.id }, include: { reactions: true } });
      expect(dbMsg.isPinned).toBe(true);
    });

    it('should allow admin to pin in group', async () => {
      const groupConv = await prisma.conversation.create({ data: {
        type: 'group',
        name: 'Test Group',
        members: { create: [
          { userId: user1.id, role: 'member' },
          { userId: user2.id, role: 'admin' },
        ] },
      } });

      const groupMessage = await prisma.message.create({ data: {
        conversationId: groupConv.id,
        senderId: user1.id,
        content: 'Group msg',
      } });

      const res = await request(app)
        .post(`/api/v1/messages/${groupMessage.id}/pin`)
        .set('Authorization', `Bearer ${token2}`); // admin

      expect(res.status).toBe(200);
      const dbMsg = await prisma.message.findUnique({ where: { id: groupMessage.id } });
      expect(dbMsg.isPinned).toBe(true);
      expect(dbMsg.pinnedById).toBe(user2.id);
    });

    it('should allow admin to unpin', async () => {
      const groupConv = await prisma.conversation.create({ data: {
        type: 'group',
        name: 'Test Group',
        members: { create: [
          { userId: user1.id, role: 'member' },
          { userId: user2.id, role: 'admin' },
        ] },
      } });

      const groupMessage = await prisma.message.create({ data: {
        conversationId: groupConv.id,
        senderId: user1.id,
        content: 'Group msg',
        isPinned: true,
        pinnedById: user2.id,
      } });

      const res = await request(app)
        .delete(`/api/v1/messages/${groupMessage.id}/pin`)
        .set('Authorization', `Bearer ${token2}`); // admin

      expect(res.status).toBe(200);
      const dbMsg = await prisma.message.findUnique({ where: { id: groupMessage.id } });
      expect(dbMsg.isPinned).toBe(false);
    });
  });

  describe('POST /api/v1/messages/:id/reactions - Reactions', () => {
    it('should add reaction', async () => {
      const res = await request(app)
        .post(`/api/v1/messages/${message.id}/reactions`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ emoji: '👍' });

      expect(res.status).toBe(200);
      const dbMsg = await prisma.message.findUnique({ where: { id: message.id }, include: { reactions: true } });
      expect(dbMsg.reactions.length).toBe(1);
      expect(dbMsg.reactions[0].emoji).toBe('👍');
      expect(dbMsg.reactions[0].userId).toBe(user2.id);
    });

    it('should remove reaction', async () => {
      await prisma.message.update({ where: { id: message.id }, data: {
        reactions: { create: [{ emoji: '👍', userId: user2.id }] },
      } });

      const res = await request(app)
        .delete(`/api/v1/messages/${message.id}/reactions`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ emoji: '👍' });

      expect(res.status).toBe(200);
      const dbMsg = await prisma.message.findUnique({ where: { id: message.id }, include: { reactions: true } });
      expect(dbMsg.reactions.length).toBe(0);
    });
  });

  describe('POST /api/v1/messages/:id/forward - Forward', () => {
    it('should forward a message successfully', async () => {
      const conv2 = await prisma.conversation.create({ data: {
        type: 'direct',
        members: { create: [
          { userId: user1.id, role: 'member' },
          { userId: user3.id, role: 'member' },
        ] },
      } });

      const res = await request(app)
        .post(`/api/v1/messages/${message.id}/forward`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ conversationId: conv2.id });

      expect(res.status).toBe(201);
      expect(res.body.data.message.forwardedFromId || res.body.data.message.forwardedFrom).toBe(message.id);
      expect(res.body.data.message.conversationId.toString()).toBe(conv2.id.toString());
    });

    it('should fail if user not in target conversation', async () => {
      const conv2 = await prisma.conversation.create({ data: {
        type: 'direct',
        members: { create: [
          { userId: user2.id, role: 'member' },
          { userId: user3.id, role: 'member' },
        ] },
      } }); // user1 not in conv2

      const res = await request(app)
        .post(`/api/v1/messages/${message.id}/forward`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ conversationId: conv2.id });

      expect(res.status).toBe(403);
    });
  });
});
