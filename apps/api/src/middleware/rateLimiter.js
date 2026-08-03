import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { createApiResponse } from '@virexo/shared';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 auth requests per IP
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
