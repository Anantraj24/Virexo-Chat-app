import prisma from '../config/prisma.js';

class PresenceManager {
  constructor() {
    // Map<userIdString, Set<socketIdString>>
    this.userConnections = new Map();
    // Map<userIdString, timestampMs>
    this.lastDbWrite = new Map();
  }

  /**
   * Tracks a new socket connection for a user.
   * Returns true if this is the user's first active tab (0 -> 1 transition).
   */
  trackConnect(userId, socketId) {
    const uId = userId.toString();
    if (!this.userConnections.has(uId)) {
      this.userConnections.set(uId, new Set());
    }

    const sockets = this.userConnections.get(uId);
    const isFirstTab = sockets.size === 0;
    sockets.add(socketId);

    return { isFirstTab, connectionCount: sockets.size };
  }

  /**
   * Tracks a socket disconnect for a user.
   * Returns true if this was the user's last active tab (1 -> 0 transition).
   */
  trackDisconnect(userId, socketId) {
    const uId = userId.toString();
    if (!this.userConnections.has(uId)) {
      return { isLastTab: true, connectionCount: 0 };
    }

    const sockets = this.userConnections.get(uId);
    sockets.delete(socketId);

    const isLastTab = sockets.size === 0;
    if (isLastTab) {
      this.userConnections.delete(uId);
    }

    return { isLastTab, connectionCount: sockets.size };
  }

  /**
   * Gets total active connection count for a user across tabs.
   */
  getConnectionCount(userId) {
    const uId = userId.toString();
    return this.userConnections.get(uId)?.size || 0;
  }

  /**
   * Persists online/offline status to DB with 30-second write throttling.
   */
  async updateUserStatusThrottled(userId, status) {
    const uId = userId.toString();
    const now = Date.now();
    const lastWrite = this.lastDbWrite.get(uId) || 0;

    // Force update if status is offline or if > 30 seconds since last write
    if (status === 'offline' || now - lastWrite > 30000) {
      this.lastDbWrite.set(uId, now);
      try {
        await prisma.user.update({
          where: { id: uId },
          data: {
            status,
            lastSeen: new Date(),
          }
        });
      } catch {
        // Silently ignore background presence DB write failures
      }
    }
  }
}

export const presenceManager = new PresenceManager();
