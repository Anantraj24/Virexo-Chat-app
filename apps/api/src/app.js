import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { APP_NAME, APP_VERSION, createApiResponse } from '@virexo/shared';
import { env, validateEnv } from './config/env.js';
import { isDBConnected } from './config/db.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NotFoundError } from './utils/errors.js';
import { logger } from './utils/logger.js';

// Validate environment on boot
validateEnv();

const app = express();

// Security & Parsing Middleware Pipeline
app.use(requestIdMiddleware);
app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
      requestId: req.id,
      ip: req.ip,
    });
  });
  next();
});

// Liveness Endpoint (/health)
app.get('/health', (req, res) => {
  res.status(200).json(
    createApiResponse(true, {
      service: `${APP_NAME} API`,
      version: APP_VERSION,
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
  );
});

// Readiness Endpoint (/ready)
app.get('/ready', (req, res) => {
  const dbStatus = isDBConnected();
  if (dbStatus) {
    return res.status(200).json(
      createApiResponse(true, {
        service: `${APP_NAME} API`,
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString(),
      })
    );
  } else {
    return res.status(503).json(
      createApiResponse(false, null, {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Database is not connected',
        database: 'disconnected',
      })
    );
  }
});

// Root Info Endpoint
app.get('/', (req, res) => {
  res.status(200).json(
    createApiResponse(true, {
      name: APP_NAME,
      version: APP_VERSION,
      health: '/health',
      readiness: '/ready',
    })
  );
});

// 404 Handler
app.use((req, res, next) => {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
