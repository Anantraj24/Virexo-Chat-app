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

describe('Conversation Domain API Integration Tests', () => {
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

  it('POST /api/v1/conversations/direct should create a DM and enforce directKey uniqueness', async () => {
    const user1 = await createTestUser('user_one', 'one@example.com');
    const user2 = await createTestUser('user_two', 'two@example.com');

    // First request: Creates new DM
    const res1 = await request(app)
      .post('/api/v1/conversations/direct')
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ recipientId: user2.user.id });

    expect(res1.status).toBe(201);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.conversation.type).toBe('direct');
    expect(res1.body.data.isExisting).toBe(false);

    const firstConvId = res1.body.data.conversation.id;

    // Second request: Reuses existing DM
    const res2 = await request(app)
      .post('/api/v1/conversations/direct')
      .set('Authorization', `Bearer ${user2.token}`)
      .send({ recipientId: user1.user.id });

    expect(res2.status).toBe(200);
    expect(res2.body.data.conversation.id).toBe(firstConvId);
    expect(res2.body.data.isExisting).toBe(true);

    // Verify DB count is strictly 1
    const count = await prisma.conversation.count();
    expect(count).toBe(1);
  });

  it('POST /api/v1/conversations/group should create a group with owner role', async () => {
    const user1 = await createTestUser('owner_user', 'owner@example.com');
    const user2 = await createTestUser('member_user', 'member@example.com');

    const res = await request(app)
      .post('/api/v1/conversations/group')
      .set('Authorization', `Bearer ${user1.token}`)
      .send({
        name: 'Engineering General',
        description: 'Main dev discussion channel',
        memberIds: [user2.user.id],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.conversation.name).toBe('Engineering General');

    const members = res.body.data.conversation.members;
    expect(members.length).toBe(2);

    const ownerMember = members.find((m) => (m.userId.id || m.userId).toString() === user1.user.id);
    expect(ownerMember.role).toBe('owner');
  });

  it('GET /api/v1/conversations should return cursor-paginated conversations', async () => {
    const user1 = await createTestUser('main_user', 'main@example.com');
    const user2 = await createTestUser('other_user', 'other@example.com');

    // Create 3 groups
    for (let i = 1; i <= 3; i++) {
      await request(app)
        .post('/api/v1/conversations/group')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ name: `Group ${i}`, memberIds: [user2.user.id] });
    }

    const listRes = await request(app)
      .get('/api/v1/conversations?limit=2')
      .set('Authorization', `Bearer ${user1.token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.conversations.length).toBe(2);
    expect(listRes.body.data.pagination.hasNextPage).toBe(true);
    expect(listRes.body.data.pagination.nextCursor).toBeTruthy();
  });

  it('PATCH /api/v1/conversations/:id should allow owner/admin but reject regular member', async () => {
    const user1 = await createTestUser('owner_u', 'owner_u@example.com');
    const user2 = await createTestUser('regular_u', 'regular_u@example.com');

    const createRes = await request(app)
      .post('/api/v1/conversations/group')
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ name: 'Original Name', memberIds: [user2.user.id] });

    const group = createRes.body.data.conversation;

    // Regular member attempts update -> 403
    const forbiddenRes = await request(app)
      .patch(`/api/v1/conversations/${group.id}`)
      .set('Authorization', `Bearer ${user2.token}`)
      .send({ name: 'Hacked Name' });

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error.code).toBe('PERMISSION_DENIED');

    // Owner attempts update -> 200
    const ownerRes = await request(app)
      .patch(`/api/v1/conversations/${group.id}`)
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ name: 'Updated Name' });

    expect(ownerRes.status).toBe(200);
    expect(ownerRes.body.data.conversation.name).toBe('Updated Name');
  });

  it('PATCH /api/v1/conversations/:id/members/:userId/role should promote/demote admins', async () => {
    const user1 = await createTestUser('owner_admin', 'owner_admin@example.com');
    const user2 = await createTestUser('promoted_user', 'promoted@example.com');

    const createRes = await request(app)
      .post('/api/v1/conversations/group')
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ name: 'Admin Test Group', memberIds: [user2.user.id] });

    const group = createRes.body.data.conversation;

    // Promote user2 to admin
    const promoteRes = await request(app)
      .patch(`/api/v1/conversations/${group.id}/members/${user2.user.id}/role`)
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ role: 'admin' });

    expect(promoteRes.status).toBe(200);

    const promotedMember = promoteRes.body.data.conversation.members.find(
      (m) => (m.userId.id || m.userId).toString() === user2.user.id
    );
    expect(promotedMember.role).toBe('admin');
  });

  it('POST /api/v1/conversations/:id/transfer-ownership should transfer group ownership', async () => {
    const user1 = await createTestUser('old_owner', 'old_owner@example.com');
    const user2 = await createTestUser('new_owner', 'new_owner@example.com');

    const createRes = await request(app)
      .post('/api/v1/conversations/group')
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ name: 'Transfer Group', memberIds: [user2.user.id] });

    const group = createRes.body.data.conversation;

    const transferRes = await request(app)
      .post(`/api/v1/conversations/${group.id}/transfer-ownership`)
      .set('Authorization', `Bearer ${user1.token}`)
      .send({ newOwnerId: user2.user.id });

    expect(transferRes.status).toBe(200);

    const members = transferRes.body.data.conversation.members;
    const oldOwnerMember = members.find((m) => (m.userId.id || m.userId).toString() === user1.user.id);
    const newOwnerMember = members.find((m) => (m.userId.id || m.userId).toString() === user2.user.id);

    expect(oldOwnerMember.role).toBe('admin');
    expect(newOwnerMember.role).toBe('owner');
  });
});
