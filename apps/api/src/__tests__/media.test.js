import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { setupTestDB, teardownTestDB, cleanCollections, prisma } from './testSetup.js';
import { generateAccessToken } from '../utils/token.js';

beforeAll(async () => {
  await setupTestDB();
}, 60000);

afterAll(async () => {
  await teardownTestDB();
});

let token;
let user;

beforeEach(async () => {
  await cleanCollections();
  
  user = await prisma.user.create({
    data: {
      username: 'media_test_user',
      email: 'media@example.com',
      passwordHash: 'hashedpassword',
      isEmailVerified: true
    }
  });

  token = generateAccessToken(user);
});

describe('Media API Integration Tests', () => {
  it('should return 401 if unauthorized', async () => {
    const res = await request(app).post('/api/v1/media/upload');
    expect(res.status).toBe(401);
  });

  it('should return 400 if no file is uploaded', async () => {
    const res = await request(app)
      .post('/api/v1/media/upload')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should successfully upload an image and return metadata', async () => {
    const imageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    );

    const res = await request(app)
      .post('/api/v1/media/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', imageBuffer, 'test.png');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.attachment.type).toBe('image');
    expect(res.body.data.attachment.url).toBeDefined();
    expect(res.body.data.attachment.publicId).toBeDefined();
    expect(res.body.data.attachment.filename).toBe('test.png');
  });

  it('should reject unsupported file types', async () => {
    const txtBuffer = Buffer.from('hello world', 'utf8');

    const res = await request(app)
      .post('/api/v1/media/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', txtBuffer, 'test.txt');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Unsupported file type/);
  });
});
