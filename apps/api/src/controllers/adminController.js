import { User } from '../models/User.js';
import { Report } from '../models/Report.js';
import { AdminAuditLog } from '../models/AdminAuditLog.js';
import { createApiResponse } from '@virexo/shared';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { getIO } from '../socket/socketServer.js';
import { SOCKET_EVENTS } from '@virexo/shared';

// Helper to log admin actions
const logAdminAction = async (adminId, action, targetType, targetId, details = {}) => {
  await AdminAuditLog.create({
    admin: adminId,
    action,
    targetType,
    targetId,
    details,
  });
};

export const getUsers = async (req, res, next) => {
  try {
    const { search, role, status, accountStatus, cursor, limit = 20 } = req.query;
    const query = {};

    if (search) {
      query.$text = { $search: search };
    }
    if (role) query.role = role;
    if (status) query.status = status;
    if (accountStatus) query.accountStatus = accountStatus;
    
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .select('-passwordHash -refreshTokenHashes')
      .lean();

    const nextCursor =
      users.length > 0 ? users[users.length - 1].createdAt.toISOString() : null;
    const hasNextPage = users.length === parseInt(limit, 10);

    res.status(200).json(createApiResponse(true, { users, pagination: { nextCursor, hasNextPage } }));
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { accountStatus } = req.body;

    if (!['active', 'suspended'].includes(accountStatus)) {
      throw new BadRequestError('Invalid account status');
    }

    if (id === req.user._id.toString()) {
      throw new BadRequestError('You cannot suspend/restore your own account.');
    }

    const targetUser = await User.findById(id);
    if (!targetUser) throw new NotFoundError('User not found');
    
    if (targetUser.role === 'admin') {
      throw new BadRequestError('Cannot suspend another admin.');
    }

    targetUser.accountStatus = accountStatus;
    
    // If suspending, optionally disconnect socket
    if (accountStatus === 'suspended') {
      // Clear refresh tokens to force logout everywhere
      targetUser.refreshTokenHashes = [];
      try {
        const io = getIO();
        io.to(`user:${id}`).emit('force:logout', { reason: 'ACCOUNT_SUSPENDED' });
        io.in(`user:${id}`).disconnectSockets(true);
      } catch (err) {}
    }

    await targetUser.save();

    await logAdminAction(req.user._id, accountStatus === 'suspended' ? 'SUSPEND_USER' : 'RESTORE_USER', 'User', id, { previousStatus: targetUser.accountStatus });

    res.status(200).json(createApiResponse(true, { user: targetUser }));
  } catch (error) {
    next(error);
  }
};

export const getReports = async (req, res, next) => {
  try {
    const { status, type, cursor, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    
    if (type === 'user') query.reportedUser = { $exists: true };
    if (type === 'message') query.reportedMessage = { $exists: true };
    if (type === 'conversation') query.reportedConversation = { $exists: true };

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .populate('reporter', 'username displayName avatarUrl')
      .populate('reportedUser', 'username displayName avatarUrl accountStatus')
      .lean();

    const nextCursor =
      reports.length > 0 ? reports[reports.length - 1].createdAt.toISOString() : null;
    const hasNextPage = reports.length === parseInt(limit, 10);

    res.status(200).json(createApiResponse(true, { reports, pagination: { nextCursor, hasNextPage } }));
  } catch (error) {
    next(error);
  }
};

export const updateReportStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, moderatorNotes } = req.body;

    if (!['pending', 'investigating', 'resolved', 'dismissed'].includes(status)) {
      throw new BadRequestError('Invalid report status');
    }

    const report = await Report.findById(id);
    if (!report) throw new NotFoundError('Report not found');

    const previousStatus = report.status;
    report.status = status;
    if (moderatorNotes !== undefined) {
      report.moderatorNotes = moderatorNotes;
    }
    
    await report.save();

    await logAdminAction(req.user._id, 'UPDATE_REPORT', 'Report', id, { previousStatus, newStatus: status, moderatorNotes });

    res.status(200).json(createApiResponse(true, { report }));
  } catch (error) {
    next(error);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const { cursor, limit = 20 } = req.query;
    const query = {};

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const logs = await AdminAuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .populate('admin', 'username displayName')
      .lean();

    const nextCursor =
      logs.length > 0 ? logs[logs.length - 1].createdAt.toISOString() : null;
    const hasNextPage = logs.length === parseInt(limit, 10);

    res.status(200).json(createApiResponse(true, { logs, pagination: { nextCursor, hasNextPage } }));
  } catch (error) {
    next(error);
  }
};
