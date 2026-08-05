import prisma from '../config/prisma.js';
import { createApiResponse } from '@virexo/shared';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { getIO } from '../socket/socketServer.js';

// Helper to log admin actions
const logAdminAction = async (adminId, action, targetType, targetId, details = {}) => {
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action,
      targetType,
      targetId,
      details,
    },
  });
};

export const getUsers = async (req, res, next) => {
  try {
    const { search, role, status, accountStatus, cursor, limit = 20 } = req.query;
    const maxLimit = parseInt(limit, 10) || 20;
    
    const where = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (role) where.role = role;
    if (status) where.status = status;
    if (accountStatus) where.accountStatus = accountStatus;
    
    if (cursor) {
      where.createdAt = { lt: new Date(cursor) };
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: maxLimit,
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        bio: true,
        status: true,
        lastSeen: true,
        role: true,
        accountStatus: true,
        privacySettings: true,
        notificationSettings: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    const nextCursor =
      users.length > 0 ? users[users.length - 1].createdAt.toISOString() : null;
    const hasNextPage = users.length === maxLimit;

    res.status(200).json(createApiResponse(true, { users, pagination: { nextCursor, hasNextPage } }));
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { accountStatus } = req.body;
    const currentUserId = req.user.id || req.user.id;

    if (!['active', 'suspended'].includes(accountStatus)) {
      throw new BadRequestError('Invalid account status');
    }

    if (id === currentUserId) {
      throw new BadRequestError('You cannot suspend/restore your own account.');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        bio: true,
        status: true,
        lastSeen: true,
        role: true,
        accountStatus: true,
        privacySettings: true,
        notificationSettings: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    
    if (!targetUser) throw new NotFoundError('User not found');
    
    if (targetUser.role === 'admin') {
      throw new BadRequestError('Cannot suspend another admin.');
    }

    const previousStatus = targetUser.accountStatus;

    // Update user status
    await prisma.user.update({
      where: { id },
      data: { accountStatus }
    });

    // If suspending, disconnect socket and clear refresh tokens
    if (accountStatus === 'suspended') {
      await prisma.refreshToken.deleteMany({
        where: { userId: id }
      });
      try {
        const io = getIO();
        io.to(`user:${id}`).emit('force:logout', { reason: 'ACCOUNT_SUSPENDED' });
        io.in(`user:${id}`).disconnectSockets(true);
      } catch (err) {}
    }

    await logAdminAction(currentUserId, accountStatus === 'suspended' ? 'SUSPEND_USER' : 'RESTORE_USER', 'User', id, { previousStatus });

    const updatedUser = { ...targetUser, accountStatus };
    res.status(200).json(createApiResponse(true, { user: updatedUser }));
  } catch (error) {
    next(error);
  }
};

export const getReports = async (req, res, next) => {
  try {
    const { status, type, cursor, limit = 20 } = req.query;
    const maxLimit = parseInt(limit, 10) || 20;
    
    const where = {};

    if (status) where.status = status;
    
    if (type === 'user') where.reportedUserId = { not: null };
    if (type === 'message') where.reportedMessageId = { not: null };
    if (type === 'conversation') where.reportedConversationId = { not: null };

    if (cursor) {
      where.createdAt = { lt: new Date(cursor) };
    }

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: maxLimit,
      include: {
        reporter: {
          select: { id: true, username: true, displayName: true, avatarUrl: true }
        },
        reportedUser: {
          select: { id: true, username: true, displayName: true, avatarUrl: true, accountStatus: true }
        }
      }
    });

    const nextCursor =
      reports.length > 0 ? reports[reports.length - 1].createdAt.toISOString() : null;
    const hasNextPage = reports.length === maxLimit;

    res.status(200).json(createApiResponse(true, { reports, pagination: { nextCursor, hasNextPage } }));
  } catch (error) {
    next(error);
  }
};

export const updateReportStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, moderatorNotes } = req.body;
    const currentUserId = req.user.id || req.user.id;

    if (!['pending', 'investigating', 'resolved', 'dismissed'].includes(status)) {
      throw new BadRequestError('Invalid report status');
    }

    const report = await prisma.report.findUnique({
      where: { id }
    });
    
    if (!report) throw new NotFoundError('Report not found');

    const previousStatus = report.status;
    
    const data = { status };
    if (moderatorNotes !== undefined) {
      data.moderatorNotes = moderatorNotes;
    }
    
    const updatedReport = await prisma.report.update({
      where: { id },
      data,
      include: {
        reporter: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        reportedUser: { select: { id: true, username: true, displayName: true, avatarUrl: true, accountStatus: true } }
      }
    });

    await logAdminAction(currentUserId, 'UPDATE_REPORT', 'Report', id, { previousStatus, newStatus: status, moderatorNotes });

    res.status(200).json(createApiResponse(true, { report: updatedReport }));
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const { cursor, limit = 20 } = req.query;
    const maxLimit = parseInt(limit, 10) || 20;
    
    const where = {};

    if (cursor) {
      where.createdAt = { lt: new Date(cursor) };
    }

    const logs = await prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: maxLimit,
      include: {
        admin: {
          select: { id: true, username: true, displayName: true }
        }
      }
    });

    const nextCursor =
      logs.length > 0 ? logs[logs.length - 1].createdAt.toISOString() : null;
    const hasNextPage = logs.length === maxLimit;

    res.status(200).json(createApiResponse(true, { logs, pagination: { nextCursor, hasNextPage } }));
  } catch (error) {
    next(error);
  }
};
