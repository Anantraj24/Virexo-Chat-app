import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import app from '../app.js';
import { User } from '../models/User.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Notification } from '../models/Notification.js';
import { Report } from '../models/Report.js';
import { AdminAuditLog } from '../models/AdminAuditLog.js';
import { generateAccessToken } from '../utils/token.js';

let mongoServer;

/**
 * Start an in-memory MongoDB instance and connect Mongoose.
 * Call in beforeAll with a generous timeout.
 */
export async function setupMongoMemory() {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}

/**
 * Disconnect Mongoose and stop the in-memory MongoDB.
 * Call in afterAll.
 */
export async function teardownMongoMemory() {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}

/**
 * Delete all documents from every collection used in tests.
 * Call in beforeEach for test isolation.
 */
export async function cleanCollections() {
  const collections = [User, Conversation, Message];

  // Only clean models that exist (some tests may not import all)
  try { await Notification.deleteMany({}); } catch { /* model may not exist */ }
  try { await Report.deleteMany({}); } catch { /* model may not exist */ }
  try { await AdminAuditLog.deleteMany({}); } catch { /* model may not exist */ }

  await Promise.all(collections.map((Model) => Model.deleteMany({})));
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

  const user = await User.create(defaults);
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
  return Conversation.create({
    type,
    members,
    name: type === 'group' ? `Group_${Date.now()}` : undefined,
    ...extraFields,
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

export { app, request, mongoose };
