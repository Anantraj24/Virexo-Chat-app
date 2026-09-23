import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

export const env = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/virexo',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'development_access_token_secret_32chars_min',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'development_refresh_token_secret_32chars_min',
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'console',
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'Virexo',
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS || 'noreply@virexo.app',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  isDevelopment: process.env.NODE_ENV === 'development' || !process.env.NODE_ENV,
};

export function validateEnv() {
  const requiredInProd = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'CLIENT_URL'];
  if (env.isProduction) {
    const missing = requiredInProd.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`[Env Check Failed] Missing required production environment variables: ${missing.join(', ')}`);
    }
    if (env.EMAIL_PROVIDER === 'brevo' && !env.BREVO_API_KEY) {
      throw new Error('[Env Check Failed] BREVO_API_KEY is required when EMAIL_PROVIDER=brevo');
    }
  }
}

export function getAllowedOrigins() {
  const origins = (env.CLIENT_URL || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return origins.length > 0 ? origins : ['http://localhost:5173'];
}
