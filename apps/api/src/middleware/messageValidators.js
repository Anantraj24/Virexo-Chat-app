import { body, param, query } from 'express-validator';
import { handleValidationErrors } from './validators.js';

export const createMessageRules = [
  body('conversationId')
    .trim()
    .notEmpty()
    .withMessage('Conversation ID is required')
    .isString()
    .withMessage('Conversation ID must be a valid ID'),
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
    .isString()
    .withMessage('ReplyTo must be a valid ID'),
  body('forwardedFrom')
    .optional()
    .isString()
    .withMessage('ForwardedFrom must be a valid ID'),
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
    .isString()
    .withMessage('Invalid ID'),
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

export const getMessagesAroundRules = [
  param('conversationId')
    .isString()
    .withMessage('Invalid ID'),
  param('messageId')
    .isString()
    .withMessage('Invalid ID'),
  handleValidationErrors,
];

export const deleteMessageRules = [
  param('id')
    .isString()
    .withMessage('Invalid ID'),
  handleValidationErrors,
];

export const markReadRules = [
  param('conversationId')
    .isString()
    .withMessage('Invalid ID'),
  handleValidationErrors,
];

export const editMessageRules = [
  param('id')
    .isString()
    .withMessage('Invalid ID'),
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
    .isString()
    .withMessage('Invalid ID'),
  handleValidationErrors,
];

export const pinMessageRules = [
  param('id')
    .isString()
    .withMessage('Invalid ID'),
  handleValidationErrors,
];

export const unpinMessageRules = [
  param('id')
    .isString()
    .withMessage('Invalid ID'),
  handleValidationErrors,
];

export const addReactionRules = [
  param('id')
    .isString()
    .withMessage('Invalid ID'),
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
    .isString()
    .withMessage('Invalid ID'),
  body('emoji')
    .trim()
    .notEmpty()
    .withMessage('Emoji is required'),
  handleValidationErrors,
];

export const forwardMessageRules = [
  param('id')
    .isString()
    .withMessage('Invalid ID'),
  body('conversationId')
    .trim()
    .notEmpty()
    .withMessage('Target conversation ID is required')
    .isString()
    .withMessage('Target conversation ID must be a valid ID'),
  handleValidationErrors,
];