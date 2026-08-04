import { Report } from '../models/Report.js';
import { User } from '../models/User.js';
import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import { createApiResponse } from '@virexo/shared';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export const createReport = async (req, res, next) => {
  try {
    const { reportedUserId, reportedMessageId, reportedConversationId, reason, description } = req.body;
    
    if (!reportedUserId && !reportedMessageId && !reportedConversationId) {
      throw new BadRequestError('Must provide an entity to report (user, message, or conversation).');
    }

    if (reportedUserId) {
      const user = await User.findById(reportedUserId);
      if (!user) throw new NotFoundError('Reported user not found.');
    }
    if (reportedMessageId) {
      const message = await Message.findById(reportedMessageId);
      if (!message) throw new NotFoundError('Reported message not found.');
    }
    if (reportedConversationId) {
      const conv = await Conversation.findById(reportedConversationId);
      if (!conv) throw new NotFoundError('Reported conversation not found.');
    }

    // Check for existing pending report to prevent duplicates
    const existing = await Report.findOne({
      reporter: req.user._id,
      reportedUser: reportedUserId || null,
      reportedMessage: reportedMessageId || null,
      reportedConversation: reportedConversationId || null,
      status: 'pending',
    });

    if (existing) {
      // Return 200 with the existing report, idempotent behavior
      return res.status(200).json(createApiResponse(true, { report: existing }));
    }

    const report = await Report.create({
      reporter: req.user._id,
      reportedUser: reportedUserId || undefined,
      reportedMessage: reportedMessageId || undefined,
      reportedConversation: reportedConversationId || undefined,
      reason,
      description,
    });

    res.status(201).json(createApiResponse(true, { report }));
  } catch (error) {
    // Handle mongoose duplicate key error if concurrent requests occur
    if (error.code === 11000) {
      const existing = await Report.findOne({
        reporter: req.user._id,
        reportedUser: req.body.reportedUserId || null,
        reportedMessage: req.body.reportedMessageId || null,
        reportedConversation: req.body.reportedConversationId || null,
        status: 'pending',
      });
      return res.status(200).json(createApiResponse(true, { report: existing }));
    }
    next(error);
  }
};
