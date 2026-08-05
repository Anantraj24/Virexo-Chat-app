import request from 'supertest';
import app from '../app.js';
import prisma from '../config/prisma.js';
import { generateAccessToken } from '../utils/token.js';

/**
 * Setup hook for Prisma (if needed).
 */
export async function setupTestDB() {
  // Can be used to run migrations or seed data if needed before tests
}

/**
 * Teardown hook for Prisma.
 */
export async function teardownTestDB() {
  await prisma.$disconnect();
}

/**
 * Delete all documents from every collection used in tests.
 * Call in beforeEach for test isolation.
 * VERY IMPORTANT: ONLY runs if NODE_ENV is 'test'
 */
export async function cleanCollections() {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('cleanCollections can only be run in the test environment');
  }

  // Delete all records in reverse dependency order
  await prisma.$transaction([
    prisma.adminAuditLog.deleteMany({}),
    prisma.report.deleteMany({}),
    prisma.notification.deleteMany({}),
    prisma.messageAudit.deleteMany({}),
    prisma.readReceipt.deleteMany({}),
    prisma.reaction.deleteMany({}),
    prisma.attachment.deleteMany({}),
    prisma.message.deleteMany({}),
    prisma.conversationMember.deleteMany({}),
    prisma.conversation.deleteMany({}),
    prisma.refreshToken.deleteMany({}),
    prisma.user.deleteMany({}),
  ]);
}

/**
 * Create a user directly in the database and return the user document
 * and a valid access token. Bypasses signup flow for speed.
 *
 * @param {object} overrides - Field overrides for User.create
 * @returns {{ user: object, token: string }}
 */
export async function createTestUser(overrides = {}) {
  const defaults = {
    username: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    email: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}@test.com`,
    passwordHash: '$2a$12$dummyhashforspeedontestsnotreal1234567890abcdef',
    role: 'user',
    status: 'offline',
    ...overrides,
  };

  const user = await prisma.user.create({ data: defaults });
  const token = generateAccessToken(user);
  return { user, token };
}

/**
 * Create a user via the real signup endpoint. Returns user, token, and cookies.
 *
 * @param {string} username
 * @param {string} email
 * @param {string} [password='Password123!']
 * @returns {{ user: object, token: string, cookies: string[] }}
 */
export async function signupUser(username, email, password = 'Password123!') {
  const res = await request(app)
    .post('/api/v1/auth/signup')
    .send({ username, email, password });

  return {
    user: res.body.data.user,
    token: res.body.data.accessToken,
    cookies: res.headers['set-cookie'] || [],
    response: res,
  };
}

/**
 * Create a conversation with the specified members.
 *
 * @param {Array<{ userId: string, role: string }>} members
 * @param {string} type - 'direct' or 'group'
 * @param {object} extraFields - Additional fields (e.g. name, directKey)
 * @returns {object} Conversation document
 */
export async function createConversation(members, type = 'group', extraFields = {}) {
  return prisma.conversation.create({
    data: {
      type,
      name: type === 'group' ? `Group_${Date.now()}` : "",
      ...extraFields,
      members: {
        create: members.map(m => ({
          userId: m.userId,
          role: m.role || 'member'
        }))
      }
    },
    include: { members: true }
  });
}

/**
 * Send a text message via the API.
 *
 * @param {string} token - Bearer token
 * @param {string} conversationId
 * @param {string} content
 * @returns {object} Supertest response
 */
export async function sendMessage(token, conversationId, content = 'Hello!') {
  return request(app)
    .post('/api/v1/messages')
    .set('Authorization', `Bearer ${token}`)
    .send({ conversationId, content });
}

export { app, request, prisma };
