import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/virexo',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'development_access_token_secret_32chars_min',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'development_refresh_token_secret_32chars_min',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  isDevelopment: process.env.NODE_ENV === 'development' || !process.env.NODE_ENV,
};

export function validateEnv() {
  const requiredInProd = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'CLIENT_URL'];
  if (env.isProduction) {
    const missing = requiredInProd.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`[Env Check Failed] Missing required production environment variables: ${missing.join(', ')}`);
    }
  }
}
