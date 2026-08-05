import { query } from 'express-validator';
import { handleValidationErrors } from './validators.js';

export const searchMessagesRules = [
  query('q')
    .notEmpty()
    .withMessage('Search query (q) is required')
    .isString()
    .withMessage('Search query must be a string')
    .trim()
    .isLength({ max: 200 })
    .withMessage('Search query is too long'),
  query('conversationId')
    .optional()
    .isString()
    .withMessage('conversationId must be a valid ID'),
  query('senderId')
    .optional()
    .isString()
    .withMessage('senderId must be a valid ID'),
  query('attachmentType')
    .optional()
    .isString()
    .isIn(['image', 'video', 'document', 'audio'])
    .withMessage('Invalid attachmentType'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO Date string'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO Date string'),
  query('cursor')
    .optional()
    .isISO8601()
    .withMessage('cursor must be a valid ISO Date string'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer between 1 and 100')
    .toInt(),
  handleValidationErrors,
];

export const searchUsersRules = [
  query('q')
    .notEmpty()
    .withMessage('Search query (q) is required')
    .isString()
    .withMessage('Search query must be a string')
    .trim()
    .isLength({ max: 200 })
    .withMessage('Search query is too long'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be an integer between 1 and 50')
    .toInt(),
  handleValidationErrors,
];

export const searchConversationsRules = [
  query('q')
    .notEmpty()
    .withMessage('Search query (q) is required')
    .isString()
    .withMessage('Search query must be a string')
    .trim()
    .isLength({ max: 200 })
    .withMessage('Search query is too long'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be an integer between 1 and 50')
    .toInt(),
  handleValidationErrors,
];
