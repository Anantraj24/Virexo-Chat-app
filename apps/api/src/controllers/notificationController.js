import prisma from '../config/prisma.js';
import { createApiResponse, SOCKET_EVENTS } from '@virexo/shared';
import { getIO } from '../socket/socketServer.js';

export const getNotifications = async (req, res, next) => {
  try {
    const { cursor, limit = 20 } = req.query;
    const currentUserId = req.user.id || req.user.id;
    
    const where = { recipientId: currentUserId };

    if (cursor) {
      where.createdAt = { lt: new Date(cursor) };
    }

    const maxLimit = parseInt(limit, 10);

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: maxLimit,
      include: {
        actor: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, status: true, lastSeen: true }
        }
      }
    });

    const nextCursor =
      notifications.length > 0
        ? notifications[notifications.length - 1].createdAt.toISOString()
        : null;

    const hasNextPage = notifications.length === maxLimit;

    const unreadCount = await prisma.notification.count({
      where: {
        recipientId: currentUserId,
        isRead: false,
      }
    });

    res.status(200).json(
      createApiResponse(true, {
        notifications,
        unreadCount,
        pagination: { nextCursor, hasNextPage },
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const currentUserId = req.user.id || req.user.id;
    const unreadCount = await prisma.notification.count({
      where: {
        recipientId: currentUserId,
        isRead: false,
      }
    });

    res.status(200).json(createApiResponse(true, { unreadCount }));
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id || req.user.id;

    // First check if it exists and belongs to the user
    const existing = await prisma.notification.findUnique({
      where: { id }
    });

    if (!existing || existing.recipientId !== currentUserId) {
      return res.status(404).json(createApiResponse(false, null, 'Notification not found'));
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    try {
      const io = getIO();
      io.to(`user:${currentUserId}`).emit(SOCKET_EVENTS.NOTIFICATION_READ, {
        notificationId: notification.id,
      });
    } catch (err) {}

    res.status(200).json(createApiResponse(true, { notification }));
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const currentUserId = req.user.id || req.user.id;
    
    await prisma.notification.updateMany({
      where: { recipientId: currentUserId, isRead: false },
      data: { isRead: true }
    });

    try {
      const io = getIO();
      io.to(`user:${currentUserId}`).emit(SOCKET_EVENTS.NOTIFICATION_READ, {
        all: true,
      });
    } catch (err) {}

    res.status(200).json(createApiResponse(true, { message: 'All notifications marked as read' }));
  } catch (error) {
    next(error);
  }
};

// Helper for backend logic to trigger a notification
export const triggerNotification = async ({
  recipientId,
  actorId,
  type,
  entityId,
  entityModel,
  content,
}) => {
  if (recipientId === actorId) return; // Don't notify self

  // Check for duplicate unread notification of the same type/entity/actor
  const existing = await prisma.notification.findFirst({
    where: {
      recipientId,
      actorId,
      type,
      entityId,
      isRead: false,
    }
  });

  if (existing) {
    // Already an unread notification for this, skip creating duplicate to prevent spam
    return existing;
  }

  const notification = await prisma.notification.create({
    data: {
      recipientId,
      actorId,
      type,
      entityId,
      entityModel,
      content,
    },
    include: {
      actor: {
        select: { id: true, username: true, displayName: true, avatarUrl: true, status: true, lastSeen: true }
      }
    }
  });

  try {
    const io = getIO();
    io.to(`user:${recipientId}`).emit(SOCKET_EVENTS.NOTIFICATION_NEW, {
      notification,
    });
  } catch (error) {
    // Ignore in tests if socket server is not started
  }

  return notification;
};
