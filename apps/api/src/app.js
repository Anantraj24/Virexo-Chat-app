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
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Validate environment on boot
validateEnv();

const app = express();

// Security & Parsing Middleware Pipeline
app.use(requestIdMiddleware);
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow dynamic local network origins in development
      if (env.isDevelopment) {
        if (!origin || origin.startsWith('http://localhost:') || origin.match(/^http:\/\/(192\.168\.|172\.|10\.)/)) {
          return callback(null, true);
        }
      }
      
      // Fallback for production or specific origin
      if (origin === env.CLIENT_URL || !origin) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
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

// API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/search', searchRoutes);

// Apply generic rate limiter to other routes
app.use('/api/v1', apiLimiter);

app.use('/api/v1/users', userRoutes);
app.use('/api/v1/conversations', conversationRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/media', mediaRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/admin', adminRoutes);

// Root Info Endpoint
app.get('/', (req, res) => {
  res.status(200).json(
    createApiResponse(true, {
      name: APP_NAME,
      version: APP_VERSION,
      health: '/health',
      readiness: '/ready',
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      conversations: '/api/v1/conversations',
      messages: '/api/v1/messages',
      media: '/api/v1/media',
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
