import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { setupTestDB, teardownTestDB, cleanCollections, prisma } from './testSetup.js';

beforeAll(async () => {
  await setupTestDB();
}, 60000);

afterAll(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await cleanCollections();
});

describe('User Profile & Settings API Integration Tests', () => {
  async function getAuthToken(prefix = 'jordan') {
    const unique = `${Date.now().toString().slice(-6)}_${Math.random().toString(36).slice(2, 6)}`;
    const username = `${prefix.slice(0, 10)}_${unique}`;
    const email = `${username}@example.com`;
    const signupRes = await request(app).post('/api/v1/auth/signup').send({
      username,
      email,
      password: 'Password123!',
    });
    return { token: signupRes.body.data.accessToken, username, email, user: signupRes.body.data.user };
  }

  it('GET /api/v1/users/profile should return current user profile', async () => {
    const { token, username } = await getAuthToken();

    const res = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe(username);
    expect(res.body.data.user.privacySettings).toBeDefined();
    expect(res.body.data.user.notificationSettings).toBeDefined();
  });

  it('PATCH /api/v1/users/profile should update displayName and bio', async () => {
    const { token } = await getAuthToken();

    const updateRes = await request(app)
      .patch('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        displayName: 'Jordan Vance',
        bio: 'Senior Full Stack Engineer & UI Architect',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.user.displayName).toBe('Jordan Vance');
    expect(updateRes.body.data.user.bio).toBe('Senior Full Stack Engineer & UI Architect');
  });

  it('PATCH /api/v1/users/profile should reject existing taken username', async () => {
    const { token: token1 } = await getAuthToken('user1');
    const { username: username2 } = await getAuthToken('user2');

    const updateRes = await request(app)
      .patch('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token1}`)
      .send({ username: username2 });

    expect(updateRes.status).toBe(400);
    expect(updateRes.body.error.code).toBe('USERNAME_TAKEN');
  });

  it('GET /api/v1/users/check-username should verify availability', async () => {
    const { token, username } = await getAuthToken();

    // Check taken username
    const resTaken = await request(app)
      .get(`/api/v1/users/check-username?username=${username}`)
      .set('Authorization', `Bearer ${token}`);

    expect(resTaken.status).toBe(200);
    expect(resTaken.body.data.isCurrent).toBe(true);

    // Check available username
    const uniqueAvail = `new_name_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const resAvail = await request(app)
      .get(`/api/v1/users/check-username?username=${uniqueAvail}`)
      .set('Authorization', `Bearer ${token}`);

    expect(resAvail.status).toBe(200);
    expect(resAvail.body.data.isAvailable).toBe(true);
  });

  it('PATCH /api/v1/users/privacy should update privacy controls', async () => {
    const { token } = await getAuthToken();

    const res = await request(app)
      .patch('/api/v1/users/privacy')
      .set('Authorization', `Bearer ${token}`)
      .send({
        showOnlineStatus: false,
        allowDirectMessages: 'friends',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.privacySettings.showOnlineStatus).toBe(false);
    expect(res.body.data.privacySettings.allowDirectMessages).toBe('friends');
  });

  it('PATCH /api/v1/users/notifications should update notification toggles', async () => {
    const { token } = await getAuthToken();

    const res = await request(app)
      .patch('/api/v1/users/notifications')
      .set('Authorization', `Bearer ${token}`)
      .send({
        soundEnabled: false,
        desktopNotifications: true,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.notificationSettings.soundEnabled).toBe(false);
    expect(res.body.data.notificationSettings.desktopNotifications).toBe(true);
  });

  it('GET /api/v1/users/search should return sanitized search-safe users', async () => {
    const { token, username } = await getAuthToken('unique_jordan');

    const searchRes = await request(app)
      .get(`/api/v1/users/search?q=${username}`)
      .set('Authorization', `Bearer ${token}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.data.users.length).toBe(1);
    expect(searchRes.body.data.users[0].username).toBe(username);
    expect(searchRes.body.data.users[0].email).toBeUndefined(); // Email stripped
  });
});
