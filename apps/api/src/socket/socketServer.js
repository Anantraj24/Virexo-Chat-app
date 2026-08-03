/**
 * Single Render Instance Socket.IO Architecture & Redis Adapter Boundary
 *
 * Current Architecture (Phase 10):
 * - Operates with default in-memory Socket.IO adapter suited for a single Render free-tier web service instance.
 * - State management (user connections, typing auto-expiry, presence throttling) uses in-memory Maps.
 *
 * Future Multi-Instance Horizontal Scaling Boundary (Redis Adapter):
 * - When scaling to multiple Render app instances, install `@socket.io/redis-adapter` and `ioredis`.
 * - Replace in-memory adapter with `io.adapter(createAdapter(pubClient, subClient))`.
 * - Replace in-memory `presenceManager` Maps with Redis hash keys (`HSET presence:users <userId> <count>`).
 */

import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { socketAuthMiddleware } from './socketAuth.js';
import { setupSocketHandlers } from './socketHandler.js';

let io = null;

export function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  // Handshake JWT authentication middleware
  io.use(socketAuthMiddleware);

  // Connection handler
  io.on('connection', (socket) => {
    logger.info(`[Socket.IO] User connected: ${socket.user.username} (socketId: ${socket.id})`);
    setupSocketHandlers(io, socket);
  });

  logger.info('[Socket.IO] Server initialized successfully.');
  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.IO server has not been initialized');
  }
  return io;
}
