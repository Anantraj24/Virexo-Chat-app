import prisma from './prisma.js';
import { env } from './env.js';

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log(`[PostgreSQL] Connected successfully to database via Prisma`);
    return prisma;
  } catch (error) {
    console.error('[PostgreSQL] Connection error:', error.message);
    if (!env.isTest) {
      process.exit(1);
    }
    throw error;
  }
};

export const disconnectDB = async () => {
  await prisma.$disconnect();
  console.log('[PostgreSQL] Disconnected cleanly');
};

export const isDBConnected = async () => {
  try {
    // Simple query to verify connection
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    return false;
  }
};
