import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import { io as ClientIO } from 'socket.io-client';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import { initSocketServer } from '../socket/socketServer.js';
import { User } from '../models/User.js';
import { Conversation } from '../models/Conversation.js';
import { generateAccessToken } from '../utils/token.js';
import { SOCKET_EVENTS } from '@virexo/shared';

let mongoServer;
let httpServer;
let port;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  httpServer = http.createServer(app);
  initSocketServer(httpServer);

  await new Promise((resolve) => {
    httpServer.listen(0, () => {
      port = httpServer.address().port;
      resolve();
    });
  });
}, 60000);

afterAll(async () => {
  await new Promise((resolve) => httpServer.close(resolve));
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
  await Conversation.deleteMany({});
});

describe('Socket.IO Real-Time Foundation Integration Tests', () => {
  async function createTestUser(username, email) {
    const user = await User.create({
      username,
      email,
      passwordHash: 'hashed_password',
      status: 'offline',
    });
    const token = generateAccessToken(user);
    return { user, token };
  }

  function createSocketClient(token) {
    return ClientIO(`http://localhost:${port}`, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
    });
  }

  it('should authenticate socket connection with valid JWT and join user room', async () => {
    const { token } = await createTestUser('socket_u1', 'u1@example.com');
    const client = createSocketClient(token);

    await new Promise((resolve, reject) => {
      client.on('connect', () => {
        expect(client.connected).toBe(true);
        client.disconnect();
        resolve();
      });
      client.on('connect_error', (err) => {
        reject(err);
      });
    });
  });

  it('should reject socket connection with invalid JWT', async () => {
    const client = createSocketClient('invalid_jwt_token');

    await new Promise((resolve) => {
      client.on('connect_error', (err) => {
        expect(err.message).toContain('Authentication failed');
        client.disconnect();
        resolve();
      });
    });
  });

  it('should allow conversation room join for members and reject non-members', async () => {
    const user1 = await createTestUser('member_u1', 'm1@example.com');
    const user2 = await createTestUser('nonmember_u2', 'm2@example.com');

    const conversation = await Conversation.create({
      type: 'group',
      name: 'Secret Group',
      members: [{ userId: user1.user._id, role: 'owner' }],
    });

    const client1 = createSocketClient(user1.token);
    const client2 = createSocketClient(user2.token);

    await new Promise((resolve) => client1.on('connect', resolve));
    await new Promise((resolve) => client2.on('connect', resolve));

    // User1 (member) joins -> success
    const ack1 = await new Promise((resolve) => {
      client1.emit(SOCKET_EVENTS.JOIN_CONVERSATION, { conversationId: conversation._id.toString() }, resolve);
    });
    expect(ack1.success).toBe(true);

    // User2 (non-member) joins -> failure
    const ack2 = await new Promise((resolve) => {
      client2.emit(SOCKET_EVENTS.JOIN_CONVERSATION, { conversationId: conversation._id.toString() }, resolve);
    });
    expect(ack2.success).toBe(false);
    expect(ack2.error).toBe('Not a member of conversation');

    client1.disconnect();
    client2.disconnect();
  });

  it('should broadcast typing indicator and handle auto-stop', async () => {
    const user1 = await createTestUser('typer_1', 't1@example.com');
    const user2 = await createTestUser('watcher_2', 't2@example.com');

    const conversation = await Conversation.create({
      type: 'group',
      name: 'Typing Group',
      members: [
        { userId: user1.user._id, role: 'owner' },
        { userId: user2.user._id, role: 'member' },
      ],
    });

    const convId = conversation._id.toString();
    const client1 = createSocketClient(user1.token);
    const client2 = createSocketClient(user2.token);

    await new Promise((resolve) => client1.on('connect', resolve));
    await new Promise((resolve) => client2.on('connect', resolve));

    // Both join conversation room
    await new Promise((resolve) => client1.emit(SOCKET_EVENTS.JOIN_CONVERSATION, { conversationId: convId }, resolve));
    await new Promise((resolve) => client2.emit(SOCKET_EVENTS.JOIN_CONVERSATION, { conversationId: convId }, resolve));

    // Client2 listens for typing indicator
    const typingPromise = new Promise((resolve) => {
      client2.on(SOCKET_EVENTS.TYPING_INDICATOR, (data) => {
        resolve(data);
      });
    });

    // Client1 starts typing
    client1.emit(SOCKET_EVENTS.TYPING_START, { conversationId: convId });

    const typingData = await typingPromise;
    expect(typingData.conversationId).toBe(convId);
    expect(typingData.isTyping).toBe(true);

    client1.disconnect();
    client2.disconnect();
  });
});
