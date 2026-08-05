import prisma from '../config/prisma.js';
import { createApiResponse } from '@virexo/shared';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export const createReport = async (req, res, next) => {
  try {
    const { reportedUserId, reportedMessageId, reportedConversationId, reason, description } = req.body;
    
    if (!reportedUserId && !reportedMessageId && !reportedConversationId) {
      throw new BadRequestError('Must provide an entity to report (user, message, or conversation).');
    }

    if (reportedUserId) {
      const user = await prisma.user.findUnique({ where: { id: reportedUserId } });
      if (!user) throw new NotFoundError('Reported user not found.');
    }
    if (reportedMessageId) {
      const message = await prisma.message.findUnique({ where: { id: reportedMessageId } });
      if (!message) throw new NotFoundError('Reported message not found.');
    }
    if (reportedConversationId) {
      const conv = await prisma.conversation.findUnique({ where: { id: reportedConversationId } });
      if (!conv) throw new NotFoundError('Reported conversation not found.');
    }

    const reporterId = req.user.id || req.user.id;

    // Check for existing pending report to prevent duplicates
    const existing = await prisma.report.findFirst({
      where: {
        reporterId,
        reportedUserId: reportedUserId || null,
        reportedMessageId: reportedMessageId || null,
        reportedConversationId: reportedConversationId || null,
        status: 'pending',
      }
    });

    if (existing) {
      // Return 200 with the existing report, idempotent behavior
      return res.status(200).json(createApiResponse(true, { report: existing }));
    }

    const report = await prisma.report.create({
      data: {
        reporterId,
        reportedUserId: reportedUserId || null,
        reportedMessageId: reportedMessageId || null,
        reportedConversationId: reportedConversationId || null,
        reason,
        description,
      }
    });

    res.status(201).json(createApiResponse(true, { report }));
  } catch (error) {
    // If unique constraint error (P2002) in Prisma
    if (error.code === 'P2002') {
      const reporterId = req.user.id || req.user.id;
      const existing = await prisma.report.findFirst({
        where: {
          reporterId,
          reportedUserId: req.body.reportedUserId || null,
          reportedMessageId: req.body.reportedMessageId || null,
          reportedConversationId: req.body.reportedConversationId || null,
          status: 'pending',
        }
      });
      return res.status(200).json(createApiResponse(true, { report: existing }));
    }
    next(error);
  }
};
