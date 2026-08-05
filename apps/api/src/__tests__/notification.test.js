import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma,
  setupTestDB,
  teardownTestDB,
  cleanCollections,
  createTestUser,
  app,
  request,
} from './testSetup.js';

beforeAll(async () => {
  await setupTestDB();
}, 60000);

afterAll(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await cleanCollections();
});

describe('Notification API Integration Tests', () => {
  async function seedNotifications(recipientId, actorId, count = 3) {
    const notifications = [];
    for (let i = 0; i < count; i++) {
      const n = await prisma.notification.create({
        data: {
          recipientId: recipientId,
          actorId: actorId,
          type: 'message_reply',
          entityId: recipientId, // dummy entity
          entityModel: 'Message',
          content: `Notification ${i + 1}`,
          isRead: i === 0, // first one is read, rest are unread
        },
      });
      notifications.push(n);
    }
    return notifications;
  }

  it('GET /api/v1/notifications should return paginated notifications for authenticated user', async () => {
    const { user: recipient, token } = await createTestUser({ username: 'notif_user' });
    const { user: actor } = await createTestUser({ username: 'actor_user' });

    await seedNotifications(recipient.id, actor.id, 3);

    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notifications).toBeInstanceOf(Array);
    expect(res.body.data.notifications.length).toBe(3);
    expect(res.body.data.unreadCount).toBe(2); // 2 unread (index 1 and 2)
    expect(res.body.data.pagination).toBeDefined();
  });

  it('GET /api/v1/notifications/unread-count should return unread count', async () => {
    const { user: recipient, token } = await createTestUser({ username: 'count_user' });
    const { user: actor } = await createTestUser({ username: 'count_actor' });

    await seedNotifications(recipient.id, actor.id, 5);

    const res = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.unreadCount).toBe(4); // first is read, 4 unread
  });

  it('POST /api/v1/notifications/:id/read should mark a notification as read', async () => {
    const { user: recipient, token } = await createTestUser({ username: 'mark_user' });
    const { user: actor } = await createTestUser({ username: 'mark_actor' });

    const notifications = await seedNotifications(recipient.id, actor.id, 2);
    const unreadNotif = notifications[1]; // second is unread

    const res = await request(app)
      .post(`/api/v1/notifications/${unreadNotif.id}/read`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.notification.isRead).toBe(true);
  });

  it('POST /api/v1/notifications/mark-all-read should mark all as read', async () => {
    const { user: recipient, token } = await createTestUser({ username: 'all_user' });
    const { user: actor } = await createTestUser({ username: 'all_actor' });

    await seedNotifications(recipient.id, actor.id, 4);

    const res = await request(app)
      .post('/api/v1/notifications/mark-all-read')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    // Verify all are now read
    const unreadCount = await prisma.notification.count({ where: {
      recipientId: recipient.id,
      isRead: false,
    } });
    expect(unreadCount).toBe(0);
  });

  it('should reject unauthenticated requests', async () => {
    const res = await request(app).get('/api/v1/notifications');
    expect(res.status).toBe(401);
  });

  it('should not return notifications belonging to other users', async () => {
    const { user: user1, token: token1 } = await createTestUser({ username: 'owner_user' });
    const { user: user2, token: token2 } = await createTestUser({ username: 'other_user' });
    const { user: actor } = await createTestUser({ username: 'notif_actor' });

    await seedNotifications(user1.id, actor.id, 3);

    // user2 should see no notifications
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${token2}`);

    expect(res.status).toBe(200);
    expect(res.body.data.notifications.length).toBe(0);
  });
});
