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
  body('replyTo')
    .optional()
    .isMongoId()
    .withMessage('ReplyTo must be a valid MongoDB ObjectId'),
  body('forwardedFrom')
    .optional()
    .isMongoId()
    .withMessage('ForwardedFrom must be a valid MongoDB ObjectId'),
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

export const editMessageRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid message ID'),
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Message content is required')
    .isLength({ max: 2000 })
    .withMessage('Message content cannot exceed 2000 characters'),
  handleValidationErrors,
];

export const deleteForEveryoneRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid message ID'),
  handleValidationErrors,
];

export const pinMessageRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid message ID'),
  handleValidationErrors,
];

export const unpinMessageRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid message ID'),
  handleValidationErrors,
];

export const addReactionRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid message ID'),
  body('emoji')
    .trim()
    .notEmpty()
    .withMessage('Emoji is required')
    .isLength({ max: 2 })
    .withMessage('Emoji must be a single character or emoji'),
  handleValidationErrors,
];

export const removeReactionRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid message ID'),
  body('emoji')
    .trim()
    .notEmpty()
    .withMessage('Emoji is required'),
  handleValidationErrors,
];

export const forwardMessageRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid message ID'),
  body('conversationId')
    .trim()
    .notEmpty()
    .withMessage('Target conversation ID is required')
    .isMongoId()
    .withMessage('Target conversation ID must be a valid MongoDB ObjectId'),
  handleValidationErrors,
];