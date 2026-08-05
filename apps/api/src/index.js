import http from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { logger } from './utils/logger.js';
import { initSocketServer } from './socket/socketServer.js';

let httpServer;

async function startServer() {
  try {
    // Attempt DB connection in non-test mode
    if (!env.isTest) {
      try {
        await connectDB();
      } catch (dbErr) {
        logger.warn(`[PostgreSQL] Initial connection attempt deferred: ${dbErr.message}`);
      }
    }

    httpServer = http.createServer(app);

    // Initialize Socket.IO Server
    initSocketServer(httpServer);

    httpServer.listen(env.PORT, () => {
      logger.info(`[Virexo API] Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (err) {
    logger.error(`[Server Start Failure] ${err.message}`);
    process.exit(1);
  }
}

// Graceful Shutdown Lifecycle
async function gracefulShutdown(signal) {
  logger.info(`[Shutdown] ${signal} signal received. Closing server gracefully...`);

  if (httpServer) {
    httpServer.close(async () => {
      logger.info('[Shutdown] HTTP & Socket.IO server closed.');
      await disconnectDB();
      logger.info('[Shutdown] Cleanup complete. Exiting process.');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('[Shutdown] Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  } else {
    await disconnectDB();
    process.exit(0);
  }
}

if (!env.isTest) {
  startServer();

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('[Unhandled Rejection]', { reason: reason?.message || reason });
  });

  process.on('uncaughtException', (err) => {
    logger.error('[Uncaught Exception]', { error: err.message, stack: err.stack });
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });
}

export { app, httpServer };
export default app;
