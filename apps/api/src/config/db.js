import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const options = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, options);
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}`);
    return conn.connection;
  } catch (error) {
    console.error('[MongoDB] Connection error:', error.message);
    if (!env.isTest) {
      process.exit(1);
    }
    throw error;
  }
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected cleanly');
  }
};

export const isDBConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Mongoose Connection Event Handlers
mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Runtime connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB] Connection lost');
});
