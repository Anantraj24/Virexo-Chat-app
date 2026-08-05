import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { createApiResponse } from '@virexo/shared';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.isDevelopment ? 100 : 10, // Max 10 auth requests per IP in prod
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isTest, // Skip rate limiting during Vitest integration runs
  handler: (req, res) => {
    res.status(429).json(
      createApiResponse(false, null, {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many authentication attempts. Please try again after 15 minutes.',
      })
    );
  },
});

export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Max 30 search requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (req, res) => {
    res.status(429).json(
      createApiResponse(false, null, {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many search requests. Please try again after a minute.',
      })
    );
  },
});

export const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 300, // Max 300 requests per IP per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.isTest,
  handler: (req, res) => {
    res.status(429).json(
      createApiResponse(false, null, {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests. Please try again later.',
      })
    );
  },
});
