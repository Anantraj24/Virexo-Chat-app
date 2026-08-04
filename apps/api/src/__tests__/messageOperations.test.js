import request from 'supertest';
import { describe, it, expect, beforeEach, vi, afterEach, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import app from '../app.js';
import { User } from '../models/User.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { generateAccessToken } from '../utils/token.js';
import { MongoMemoryServer } from 'mongodb-memory-server';

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

    user1 = await User.create({
      username: 'user1',
      email: 'user1@example.com',
      passwordHash: 'hashed1',
      isEmailVerified: true,
    });
    token1 = generateAccessToken(user1);

    user2 = await User.create({
      username: 'user2',
      email: 'user2@example.com',
      passwordHash: 'hashed2',
      isEmailVerified: true,
    });
    token2 = generateAccessToken(user2);

    user3 = await User.create({
      username: 'user3',
      email: 'user3@example.com',
      passwordHash: 'hashed3',
      isEmailVerified: true,
    });
    token3 = generateAccessToken(user3);

    conversation = await Conversation.create({
      type: 'direct',
      members: [
        { userId: user1._id, role: 'member' },
        { userId: user2._id, role: 'member' },
      ],
    });

    message = await Message.create({
      conversationId: conversation._id,
      senderId: user1._id,
      content: 'Original message',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('PUT /api/v1/messages/:id - Edit Message', () => {
    it('should edit a message successfully if requested by sender', async () => {
      const res = await request(app)
        .put(`/api/v1/messages/${message._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ content: 'Edited message' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message.content).toBe('Edited message');
      expect(res.body.data.message.isEdited).toBe(true);

      const dbMessage = await Message.findById(message._id);
      expect(dbMessage.content).toBe('Edited message');
      expect(dbMessage.isEdited).toBe(true);
      expect(dbMessage.audit.editedBy.toString()).toBe(user1._id.toString());
    });

    it('should fail to edit message if requested by non-sender', async () => {
      const res = await request(app)
        .put(`/api/v1/messages/${message._id}`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ content: 'Hacked message' });

      expect(res.status).toBe(403);
    });

    it('should fail to edit deleted message', async () => {
      await Message.findByIdAndUpdate(message._id, { isDeleted: true });

      const res = await request(app)
        .put(`/api/v1/messages/${message._id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ content: 'Trying to edit deleted' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/messages/:id - Delete For Me', () => {
    it('should delete message for me successfully', async () => {
      const res = await request(app)
        .delete(`/api/v1/messages/${message._id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);

      const dbMessage = await Message.findById(message._id);
      expect(dbMessage.isDeleted).toBe(true);
      expect(dbMessage.audit.deletedBy.toString()).toBe(user1._id.toString());
      expect(dbMessage.audit.deletionScope).toBe('self');
    });

    it('should allow group admin to delete someone else message for me', async () => {
      const groupConv = await Conversation.create({
        type: 'group',
        name: 'Test Group',
        members: [
          { userId: user1._id, role: 'member' },
          { userId: user2._id, role: 'admin' },
        ],
      });

      const groupMessage = await Message.create({
        conversationId: groupConv._id,
        senderId: user1._id,
        content: 'Group msg',
      });

      const res = await request(app)
        .delete(`/api/v1/messages/${groupMessage._id}`)
        .set('Authorization', `Bearer ${token2}`); // admin

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/messages/:id/everyone - Delete For Everyone', () => {
    it('should delete message for everyone if within 2 minutes', async () => {
      const res = await request(app)
        .delete(`/api/v1/messages/${message._id}/everyone`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      const dbMessage = await Message.findById(message._id);
      expect(dbMessage.isDeleted).toBe(true);
      expect(dbMessage.content).toBe('[This message was deleted]');
      expect(dbMessage.audit.deletionScope).toBe('everyone');
    });

    it('should fail if requested by non-sender', async () => {
      const res = await request(app)
        .delete(`/api/v1/messages/${message._id}/everyone`)
        .set('Authorization', `Bearer ${token2}`);

      expect(res.status).toBe(403);
    });

    it('should fail if outside 2 minute window', async () => {
      vi.useFakeTimers();
      
      const oldMessage = await Message.create({
        conversationId: conversation._id,
        senderId: user1._id,
        content: 'Old msg',
        createdAt: new Date(Date.now() - 3 * 60 * 1000), // 3 mins ago
      });

      const res = await request(app)
        .delete(`/api/v1/messages/${oldMessage._id}/everyone`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('DELETE_WINDOW_EXPIRED');
    });
  });

  describe('POST /api/v1/messages/:id/pin - Pin/Unpin Message', () => {
    it('should allow pinning in direct message', async () => {
      const res = await request(app)
        .post(`/api/v1/messages/${message._id}/pin`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      const dbMsg = await Message.findById(message._id);
      expect(dbMsg.isPinned).toBe(true);
    });

    it('should allow admin to pin in group', async () => {
      const groupConv = await Conversation.create({
        type: 'group',
        name: 'Test Group',
        members: [
          { userId: user1._id, role: 'member' },
          { userId: user2._id, role: 'admin' },
        ],
      });

      const groupMessage = await Message.create({
        conversationId: groupConv._id,
        senderId: user1._id,
        content: 'Group msg',
      });

      const res = await request(app)
        .post(`/api/v1/messages/${groupMessage._id}/pin`)
        .set('Authorization', `Bearer ${token2}`); // admin

      expect(res.status).toBe(200);
      const dbMsg = await Message.findById(groupMessage._id);
      expect(dbMsg.isPinned).toBe(true);
      expect(dbMsg.pinnedBy.toString()).toBe(user2._id.toString());
    });

    it('should allow admin to unpin', async () => {
      const groupConv = await Conversation.create({
        type: 'group',
        name: 'Test Group',
        members: [
          { userId: user1._id, role: 'member' },
          { userId: user2._id, role: 'admin' },
        ],
      });

      const groupMessage = await Message.create({
        conversationId: groupConv._id,
        senderId: user1._id,
        content: 'Group msg',
        isPinned: true,
        pinnedBy: user2._id,
      });

      const res = await request(app)
        .delete(`/api/v1/messages/${groupMessage._id}/pin`)
        .set('Authorization', `Bearer ${token2}`); // admin

      expect(res.status).toBe(200);
      const dbMsg = await Message.findById(groupMessage._id);
      expect(dbMsg.isPinned).toBe(false);
    });
  });

  describe('POST /api/v1/messages/:id/reactions - Reactions', () => {
    it('should add reaction', async () => {
      const res = await request(app)
        .post(`/api/v1/messages/${message._id}/reactions`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ emoji: '👍' });

      expect(res.status).toBe(200);
      const dbMsg = await Message.findById(message._id);
      expect(dbMsg.reactions.length).toBe(1);
      expect(dbMsg.reactions[0].emoji).toBe('👍');
      expect(dbMsg.reactions[0].userId.toString()).toBe(user2._id.toString());
    });

    it('should remove reaction', async () => {
      await Message.findByIdAndUpdate(message._id, {
        reactions: [{ emoji: '👍', userId: user2._id }],
      });

      const res = await request(app)
        .delete(`/api/v1/messages/${message._id}/reactions`)
        .set('Authorization', `Bearer ${token2}`)
        .send({ emoji: '👍' });

      expect(res.status).toBe(200);
      const dbMsg = await Message.findById(message._id);
      expect(dbMsg.reactions.length).toBe(0);
    });
  });

  describe('POST /api/v1/messages/:id/forward - Forward', () => {
    it('should forward a message successfully', async () => {
      const conv2 = await Conversation.create({
        type: 'direct',
        members: [
          { userId: user1._id, role: 'member' },
          { userId: user3._id, role: 'member' },
        ],
      });

      const res = await request(app)
        .post(`/api/v1/messages/${message._id}/forward`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ conversationId: conv2._id });

      expect(res.status).toBe(201);
      expect(res.body.data.message.forwardedFrom).toBe(message._id.toString());
      expect(res.body.data.message.conversationId.toString()).toBe(conv2._id.toString());
    });

    it('should fail if user not in target conversation', async () => {
      const conv2 = await Conversation.create({
        type: 'direct',
        members: [
          { userId: user2._id, role: 'member' },
          { userId: user3._id, role: 'member' },
        ],
      }); // user1 not in conv2

      const res = await request(app)
        .post(`/api/v1/messages/${message._id}/forward`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ conversationId: conv2._id });

      expect(res.status).toBe(403);
    });
  });
});
