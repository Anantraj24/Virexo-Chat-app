import { body, query } from 'express-validator';
import { handleValidationErrors } from './validators.js';

export const updateProfileRules = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Display name cannot exceed 50 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Bio cannot exceed 200 characters'),
  body('avatarUrl')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Avatar URL is too long'),
  handleValidationErrors,
];

export const updatePrivacyRules = [
  body('showOnlineStatus')
    .optional()
    .isBoolean()
    .withMessage('showOnlineStatus must be a boolean'),
  body('showLastSeen')
    .optional()
    .isBoolean()
    .withMessage('showLastSeen must be a boolean'),
  body('allowDirectMessages')
    .optional()
    .isIn(['everyone', 'friends', 'none'])
    .withMessage('allowDirectMessages must be one of: everyone, friends, none'),
  handleValidationErrors,
];

export const updateNotificationRules = [
  body('emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('emailNotifications must be a boolean'),
  body('desktopNotifications')
    .optional()
    .isBoolean()
    .withMessage('desktopNotifications must be a boolean'),
  body('soundEnabled')
    .optional()
    .isBoolean()
    .withMessage('soundEnabled must be a boolean'),
  body('notifyOnMention')
    .optional()
    .isBoolean()
    .withMessage('notifyOnMention must be a boolean'),
  handleValidationErrors,
];

export const checkUsernameRules = [
  query('username')
    .trim()
    .notEmpty()
    .withMessage('Username query parameter is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  handleValidationErrors,
];

export const searchUsersRules = [
  query('q')
    .trim()
    .notEmpty()
    .withMessage('Search query parameter q is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Search query must be between 1 and 50 characters'),
  handleValidationErrors,
];
