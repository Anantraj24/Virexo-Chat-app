import { body, param, query } from 'express-validator';
import { handleValidationErrors } from './validators.js';

export const createMessageRules = [
  body('conversationId')
    .trim()
    .notEmpty()
    .withMessage('Conversation ID is required')
    .isMongoId()
    .withMessage('Conversation ID must be a valid MongoDB ObjectId'),
  body('content')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Message content cannot exceed 2000 characters'),
  body('idempotencyKey')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Idempotency key is too long'),
  // Custom validator to ensure either content or attachments exist
  body().custom((value, { req }) => {
    const hasContent = req.body.content && req.body.content.trim().length > 0;
    const hasAttachments = Array.isArray(req.body.attachments) && req.body.attachments.length > 0;

    if (!hasContent && !hasAttachments) {
      throw new Error('Message must contain either text content or attachments');
    }
    return true;
  }),
  handleValidationErrors,
];

export const getMessageHistoryRules = [
  param('conversationId')
    .isMongoId()
    .withMessage('Invalid conversation ID'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100'),
  query('cursor')
    .optional()
    .isISO8601()
    .withMessage('Cursor must be a valid ISO Date string'),
  handleValidationErrors,
];

export const deleteMessageRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid message ID'),
  handleValidationErrors,
];

export const markReadRules = [
  param('conversationId')
    .isMongoId()
    .withMessage('Invalid conversation ID'),
  handleValidationErrors,
];
