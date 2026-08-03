import { env } from '../config/env.js';

function formatLog(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta,
  };
  return env.isProduction ? JSON.stringify(logEntry) : `[${timestamp}] [${level.toUpperCase()}] ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
}

export const logger = {
  info(message, meta) {
    console.log(formatLog('info', message, meta));
  },
  warn(message, meta) {
    console.warn(formatLog('warn', message, meta));
  },
  error(message, meta) {
    console.error(formatLog('error', message, meta));
  },
  debug(message, meta) {
    if (env.isDevelopment || env.isTest) {
      console.debug(formatLog('debug', message, meta));
    }
  },
};
