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

describe('Search API Security Integration Tests', () => {
  const testUser = {
    username: 'search_tester',
    email: 'tester@example.com',
    password: 'Password123!',
  };

  async function getAuthToken() {
    const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const signupRes = await request(app).post('/api/v1/auth/signup').send({
      username: `search_${unique}`,
      email: `tester_${unique}@example.com`,
      password: 'Password123!',
    });
    return signupRes.body.data.accessToken;
  }

  it('GET /api/v1/search/users should prevent NoSQL injection by dropping invalid types', async () => {
    const token = await getAuthToken();

    // Sending an object instead of a string to cause NoSQL injection.
    // Express-validator should block this or parse it safely.
    const res = await request(app)
      .get('/api/v1/search/users?q[$ne]=x')
      .set('Authorization', `Bearer ${token}`);

    // Should return 400 Validation Error because q is not a string (it's an object)
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  it('GET /api/v1/search/messages should enforce valid limits', async () => {
    const token = await getAuthToken();

    const res = await request(app)
      .get('/api/v1/search/messages?q=hello&limit=5000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });

  it('GET /api/v1/search/messages should prevent NoSQL injection on senderId', async () => {
    const token = await getAuthToken();

    // The validator enforces senderId is a MongoID, an object will fail validation
    const res = await request(app)
      .get('/api/v1/search/messages?q=hello&senderId[$ne]=null')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });
});
