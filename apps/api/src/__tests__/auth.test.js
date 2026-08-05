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

describe('Authentication API Integration Tests', () => {
  const testUser = {
    username: 'alex_rivera',
    email: 'alex@example.com',
    password: 'Password123!',
  };

  it('POST /api/v1/auth/signup should register a new user and set HttpOnly refresh cookie', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.username).toBe(testUser.username);
    expect(res.body.data.user.passwordHash).toBeUndefined(); // Omitted in toJSON
    expect(res.body.data.accessToken).toBeDefined();

    // Check HttpOnly cookie header
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('refreshToken=');
    expect(cookies[0]).toContain('HttpOnly');
  });

  it('POST /api/v1/auth/signup should reject duplicate email or username', async () => {
    await request(app).post('/api/v1/auth/signup').send(testUser);

    const duplicateRes = await request(app).post('/api/v1/auth/signup').send(testUser);
    expect(duplicateRes.status).toBe(400);
    expect(duplicateRes.body.success).toBe(false);
    expect(duplicateRes.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('POST /api/v1/auth/login should authenticate user and issue access token', async () => {
    await request(app).post('/api/v1/auth/signup').send(testUser);

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.accessToken).toBeDefined();
  });

  it('POST /api/v1/auth/login should reject invalid credentials with generic error', async () => {
    await request(app).post('/api/v1/auth/signup').send(testUser);

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: testUser.email,
      password: 'WrongPassword123!',
    });

    expect(loginRes.status).toBe(401);
    expect(loginRes.body.success).toBe(false);
    expect(loginRes.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('GET /api/v1/auth/me should return authenticated user profile', async () => {
    const signupRes = await request(app).post('/api/v1/auth/signup').send(testUser);
    const token = signupRes.body.data.accessToken;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.email).toBe(testUser.email);
  });

  it('GET /api/v1/auth/me should reject request with missing or invalid token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('NO_TOKEN');
  });

  it('POST /api/v1/auth/refresh should rotate refresh token and issue new access token', async () => {
    const signupRes = await request(app).post('/api/v1/auth/signup').send(testUser);
    const initialCookie = signupRes.headers['set-cookie'];

    const refreshRes = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', initialCookie);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.success).toBe(true);
    expect(refreshRes.body.data.accessToken).toBeDefined();

    const newCookie = refreshRes.headers['set-cookie'];
    expect(newCookie[0]).not.toBe(initialCookie[0]);
  });

  it('POST /api/v1/auth/refresh should trigger token reuse detection if revoked token is re-sent', async () => {
    const signupRes = await request(app).post('/api/v1/auth/signup').send(testUser);
    const initialCookie = signupRes.headers['set-cookie'];

    // First refresh: rotates token
    await request(app).post('/api/v1/auth/refresh').set('Cookie', initialCookie);

    // Second refresh with initial (now revoked) cookie: triggers token reuse detection
    const reuseRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', initialCookie);

    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.error.code).toBe('TOKEN_REUSE_DETECTED');

    // Verify user sessions were completely cleared in DB
    const dbUser = await prisma.user.findFirst({ where: { email: testUser.email } });
    const tokenCount = await prisma.refreshToken.count({ where: { userId: dbUser.id } });
    expect(tokenCount).toBe(0);
  });

  it('POST /api/v1/auth/logout should revoke active refresh session and clear cookie', async () => {
    const signupRes = await request(app).post('/api/v1/auth/signup').send(testUser);
    const cookie = signupRes.headers['set-cookie'];

    const logoutRes = await request(app).post('/api/v1/auth/logout').set('Cookie', cookie);
    expect(logoutRes.status).toBe(200);

    const dbUser = await prisma.user.findFirst({ where: { email: testUser.email } });
    const tokenCount = await prisma.refreshToken.count({ where: { userId: dbUser.id } });
    expect(tokenCount).toBe(0);
  });

  it('POST /api/v1/auth/logout-all should revoke all active sessions for authenticated user', async () => {
    const signupRes = await request(app).post('/api/v1/auth/signup').send(testUser);
    const token = signupRes.body.data.accessToken;

    const logoutAllRes = await request(app)
      .post('/api/v1/auth/logout-all')
      .set('Authorization', `Bearer ${token}`);

    expect(logoutAllRes.status).toBe(200);

    const dbUser = await prisma.user.findFirst({ where: { email: testUser.email } });
    const tokenCount = await prisma.refreshToken.count({ where: { userId: dbUser.id } });
    expect(tokenCount).toBe(0);
  });

  it('Multiple sequential refreshes should produce new cookies each time', async () => {
    const signupRes = await request(app).post('/api/v1/auth/signup').send(testUser);
    let currentCookie = signupRes.headers['set-cookie'];
    const seenCookies = [];

    for (let i = 0; i < 3; i++) {
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', currentCookie);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.data.accessToken).toBeDefined();

      const newCookie = refreshRes.headers['set-cookie'];
      // Each refresh should produce a different cookie (rotated token)
      seenCookies.push(newCookie[0]);
      currentCookie = newCookie;
    }

    // All cookies should be different from each other
    const uniqueCookies = new Set(seenCookies);
    expect(uniqueCookies.size).toBe(3);
  });

  it('POST /api/v1/auth/refresh without a cookie should return 401', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/auth/refresh with a malformed cookie should return 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'refreshToken=not_a_valid_jwt_at_all');
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/auth/signup should reject missing required fields', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/auth/login should reject missing password field', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
  });
});
