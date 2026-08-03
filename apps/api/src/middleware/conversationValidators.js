import { body, param, query } from 'express-validator';
import { handleValidationErrors } from './validators.js';

export const createDirectRules = [
  body('recipientId')
    .trim()
    .notEmpty()
    .withMessage('Recipient user ID is required')
    .isMongoId()
    .withMessage('Recipient user ID must be a valid MongoDB ObjectId'),
  handleValidationErrors,
];

export const createGroupRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Group name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Group name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('memberIds')
    .optional()
    .isArray()
    .withMessage('memberIds must be an array of user IDs'),
  body('memberIds.*')
    .optional()
    .isMongoId()
    .withMessage('Each member ID must be a valid MongoDB ObjectId'),
  handleValidationErrors,
];

export const updateGroupRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid conversation ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Group name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('avatarUrl')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Avatar URL is too long'),
  handleValidationErrors,
];

export const addMembersRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid conversation ID'),
  body('memberIds')
    .isArray({ min: 1 })
    .withMessage('memberIds must be a non-empty array of user IDs'),
  body('memberIds.*')
    .isMongoId()
    .withMessage('Each member ID must be a valid MongoDB ObjectId'),
  handleValidationErrors,
];

export const removeMemberRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid conversation ID'),
  param('userId')
    .isMongoId()
    .withMessage('Invalid member user ID'),
  handleValidationErrors,
];

export const updateMemberRoleRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid conversation ID'),
  param('userId')
    .isMongoId()
    .withMessage('Invalid member user ID'),
  body('role')
    .isIn(['admin', 'member'])
    .withMessage('Role must be either admin or member'),
  handleValidationErrors,
];

export const transferOwnershipRules = [
  param('id')
    .isMongoId()
    .withMessage('Invalid conversation ID'),
  body('newOwnerId')
    .trim()
    .notEmpty()
    .withMessage('newOwnerId is required')
    .isMongoId()
    .withMessage('newOwnerId must be a valid MongoDB ObjectId'),
  handleValidationErrors,
];

export const listConversationsRules = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be an integer between 1 and 50'),
  query('cursor')
    .optional()
    .isISO8601()
    .withMessage('Cursor must be a valid ISO Date string'),
  handleValidationErrors,
];
