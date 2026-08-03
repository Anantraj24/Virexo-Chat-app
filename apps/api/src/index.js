import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { APP_NAME, APP_VERSION, createApiResponse } from '@virexo/shared';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Security & Utility Middleware
app.use(helmet());
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json(
    createApiResponse(true, {
      service: `${APP_NAME} API`,
      version: APP_VERSION,
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
  );
});

// Root endpoint redirect / baseline info
app.get('/', (req, res) => {
  res.json(
    createApiResponse(true, {
      name: APP_NAME,
      version: APP_VERSION,
      docs: '/health',
    })
  );
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json(createApiResponse(false, null, { code: 'NOT_FOUND', message: 'Route not found' }));
});

// Start Server if executing directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Virexo API] Server running on port ${PORT}`);
  });
}

export default app;
