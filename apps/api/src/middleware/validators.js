import { body, validationResult } from 'express-validator';
import { BadRequestError } from '../utils/errors.js';

export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));
    return next(new BadRequestError('Validation failed for request parameters', 'INVALID_INPUT', details));
  }
  next();
};

export const signupRules = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  handleValidationErrors,
];

export const loginRules = [
  body('email')
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Must be a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

export const verifyEmailRules = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Verification token is required')
    .isLength({ max: 128 })
    .withMessage('Token format is invalid'),
  handleValidationErrors,
];

export const forgotPasswordRules = [
  body('email')
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Must be a valid email address'),
  handleValidationErrors,
];

export const resetPasswordRules = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required')
    .isLength({ max: 128 })
    .withMessage('Token format is invalid'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/\d/)
    .withMessage('Password must contain at least one number'),
  handleValidationErrors,
];

