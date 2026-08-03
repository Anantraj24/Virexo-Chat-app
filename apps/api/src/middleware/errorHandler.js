import { createApiResponse } from '@virexo/shared';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';
  const details = err.details || null;

  logger.error(`[Error] ${req.method} ${req.originalUrl} - ${statusCode} - ${message}`, {
    requestId: req.id,
    stack: env.isProduction ? undefined : err.stack,
  });

  const responsePayload = createApiResponse(false, null, {
    code: errorCode,
    message,
    ...(details ? { details } : {}),
  });

  if (req.id) {
    responsePayload.requestId = req.id;
  }

  res.status(statusCode).json(responsePayload);
}
