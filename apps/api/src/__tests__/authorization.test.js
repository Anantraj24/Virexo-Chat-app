import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  setupMongoMemory,
  teardownMongoMemory,
  cleanCollections,
  createTestUser,
  createConversation,
  app,
  request,
} from './testSetup.js';

beforeAll(async () => {
  await setupMongoMemory();
}, 60000);

afterAll(async () => {
  await teardownMongoMemory();
});

beforeEach(async () => {
  await cleanCollections();
});

describe('Authorization Matrix Tests', () => {
  describe('No Token → 401 on protected routes', () => {
    const protectedRoutes = [
      ['GET', '/api/v1/auth/me'],
      ['GET', '/api/v1/conversations'],
      ['GET', '/api/v1/notifications'],
      ['GET', '/api/v1/users/me'],
      ['GET', '/api/v1/admin/users'],
    ];

    it.each(protectedRoutes)('%s %s should return 401 without token', async (method, path) => {
      const res = await request(app)[method.toLowerCase()](path);
      expect(res.status).toBe(401);
    });
  });

  describe('Regular User → 403 on admin routes', () => {
    let regularToken;

    beforeEach(async () => {
      const { token } = await createTestUser({ username: 'regular', role: 'user' });
      regularToken = token;
    });

    const adminRoutes = [
      ['GET', '/api/v1/admin/users'],
      ['GET', '/api/v1/admin/reports'],
      ['GET', '/api/v1/admin/audit-logs'],
    ];

    it.each(adminRoutes)('%s %s should return 403 for regular user', async (method, path) => {
      const res = await request(app)[method.toLowerCase()](path)
        .set('Authorization', `Bearer ${regularToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Admin User → 200 on admin routes', () => {
    let adminToken;

    beforeEach(async () => {
      const { token } = await createTestUser({ username: 'admin', role: 'admin' });
      adminToken = token;
    });

    it('GET /api/v1/admin/users should return 200 for admin', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });

    it('GET /api/v1/admin/reports should return 200 for admin', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('Suspended User → 403 on non-auth routes', () => {
    let suspendedToken;

    beforeEach(async () => {
      const { token } = await createTestUser({
        username: 'suspended',
        accountStatus: 'suspended',
      });
      suspendedToken = token;
    });

    it('GET /api/v1/users/me should return 403 for suspended user', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${suspendedToken}`);
      expect(res.status).toBe(403);
    });

    it('GET /api/v1/conversations should return 403 for suspended user', async () => {
      const res = await request(app)
        .get('/api/v1/conversations')
        .set('Authorization', `Bearer ${suspendedToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Non-member → forbidden on conversation operations', () => {
    it('should deny a non-member from sending a message to a conversation', async () => {
      const { user: owner, token: ownerToken } = await createTestUser({ username: 'conv_owner' });
      const { user: member } = await createTestUser({ username: 'conv_member' });
      const { token: outsiderToken } = await createTestUser({ username: 'outsider' });

      const conversation = await createConversation([
        { userId: owner._id, role: 'owner' },
        { userId: member._id, role: 'member' },
      ], 'group');

      const res = await request(app)
        .post('/api/v1/messages')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .send({ conversationId: conversation._id.toString(), content: 'I should not be able to send this' });

      expect(res.status).toBe(403);
    });
  });

  describe('Member → forbidden on owner-only operations', () => {
    it('should deny a regular member from deleting a group', async () => {
      const { user: owner } = await createTestUser({ username: 'grp_owner' });
      const { user: member, token: memberToken } = await createTestUser({ username: 'grp_member' });

      const conversation = await createConversation([
        { userId: owner._id, role: 'owner' },
        { userId: member._id, role: 'member' },
      ], 'group');

      const res = await request(app)
        .delete(`/api/v1/conversations/${conversation._id}`)
        .set('Authorization', `Bearer ${memberToken}`);

      // Should be 403 or 404 (depending on implementation — either is acceptable for authorization denial)
      expect([403, 404]).toContain(res.status);
    });

    it('should deny a regular member from transferring group ownership', async () => {
      const { user: owner } = await createTestUser({ username: 'xfer_owner' });
      const { user: member, token: memberToken } = await createTestUser({ username: 'xfer_member' });
      const { user: target } = await createTestUser({ username: 'xfer_target' });

      const conversation = await createConversation([
        { userId: owner._id, role: 'owner' },
        { userId: member._id, role: 'member' },
        { userId: target._id, role: 'member' },
      ], 'group');

      const res = await request(app)
        .post(`/api/v1/conversations/${conversation._id}/transfer-ownership`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ newOwnerId: target._id.toString() });

      expect(res.status).toBe(403);
    });
  });
});
