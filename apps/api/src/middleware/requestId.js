import crypto from 'node:crypto';

export function requestIdMiddleware(req, res, next) {
  const existingId = req.headers['x-request-id'] || req.headers['X-Request-ID'];
  const requestId = existingId || crypto.randomUUID();

  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}
