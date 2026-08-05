import { createApiResponse } from '@virexo/shared';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || 500;
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let details = err.details || null;

  // Handle Prisma Known Errors
  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      statusCode = 409;
      errorCode = 'UNIQUE_CONSTRAINT_FAILED';
      message = 'A record with this value already exists.';
    } else if (err.code === 'P2025') {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
      message = 'Record not found.';
    } else {
      statusCode = 400;
      errorCode = 'BAD_REQUEST';
    }
  } else if (err.name === 'PrismaClientValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Invalid data provided.';
  }

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
