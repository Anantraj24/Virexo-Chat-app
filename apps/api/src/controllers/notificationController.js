import { Notification } from '../models/Notification.js';
import { createApiResponse, SOCKET_EVENTS } from '@virexo/shared';
import { getIO } from '../socket/socketServer.js';

export const getNotifications = async (req, res, next) => {
  try {
  const { cursor, limit = 20 } = req.query;
  const query = { recipient: req.user._id };

  if (cursor) {
    query.createdAt = { $lt: new Date(cursor) };
  }

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit, 10))
    .populate('actor', 'username displayName avatarUrl status lastSeen')
    .lean();

  const nextCursor =
    notifications.length > 0
      ? notifications[notifications.length - 1].createdAt.toISOString()
      : null;

  const hasNextPage = notifications.length === parseInt(limit, 10);

  const unreadCount = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
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
  const unreadCount = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
  });

  res.status(200).json(createApiResponse(true, { unreadCount }));
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
  const { id } = req.params;

  const notification = await Notification.findOneAndUpdate(
    { _id: id, recipient: req.user._id },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return res.status(404).json(createApiResponse(false, null, 'Notification not found'));
  }

  try {
    const io = getIO();
    io.to(`user:${req.user._id}`).emit(SOCKET_EVENTS.NOTIFICATION_READ, {
      notificationId: notification._id,
    });
  } catch (err) {}

  res.status(200).json(createApiResponse(true, { notification }));
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true }
  );

  try {
    const io = getIO();
    io.to(`user:${req.user._id}`).emit(SOCKET_EVENTS.NOTIFICATION_READ, {
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
  if (recipientId.toString() === actorId.toString()) return; // Don't notify self

  // Check for duplicate unread notification of the same type/entity/actor
  const existing = await Notification.findOne({
    recipient: recipientId,
    actor: actorId,
    type,
    entityId,
    isRead: false,
  });

  if (existing) {
    // Already an unread notification for this, skip creating duplicate to prevent spam
    return existing;
  }

  const notification = await Notification.create({
    recipient: recipientId,
    actor: actorId,
    type,
    entityId,
    entityModel,
    content,
  });

  const populated = await Notification.findById(notification._id)
    .populate('actor', 'username displayName avatarUrl status lastSeen')
    .lean();

  try {
    const io = getIO();
    io.to(`user:${recipientId}`).emit(SOCKET_EVENTS.NOTIFICATION_NEW, {
      notification: populated,
    });
  } catch (error) {
    // Ignore in tests if socket server is not started
  }

  return populated;
};
