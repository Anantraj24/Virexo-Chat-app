import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { verificationEmailTemplate, passwordResetEmailTemplate } from './email/templates.js';

/**
 * Provider-independent email service.
 * Selects the adapter based on EMAIL_PROVIDER env var.
 */

let adapterModule = null;

async function getAdapter() {
  if (adapterModule) return adapterModule;

  if (env.EMAIL_PROVIDER === 'brevo') {
    adapterModule = await import('./email/brevoAdapter.js');
  } else {
    adapterModule = await import('./email/consoleAdapter.js');
  }

  return adapterModule;
}

/**
 * Send an email verification message.
 * @param {string} to - Recipient email address
 * @param {string} username - Display name for personalization
 * @param {string} token - Raw verification token (included in URL, not logged)
 */
export async function sendVerificationEmail(to, username, token) {
  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${token}`;
  const template = verificationEmailTemplate({ username, verifyUrl });

  try {
    const adapter = await getAdapter();
    return await adapter.sendEmail({ to, ...template });
  } catch (error) {
    logger.error('[EmailService] Failed to send verification email', {
      to,
      error: error.message,
    });
    // Don't throw — signup should succeed even if email fails
    return { success: false, error: error.message };
  }
}

/**
 * Send a password reset email.
 * @param {string} to - Recipient email address
 * @param {string} username - Display name for personalization
 * @param {string} token - Raw reset token (included in URL, not logged)
 */
export async function sendPasswordResetEmail(to, username, token) {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;
  const template = passwordResetEmailTemplate({ username, resetUrl });

  try {
    const adapter = await getAdapter();
    return await adapter.sendEmail({ to, ...template });
  } catch (error) {
    logger.error('[EmailService] Failed to send password reset email', {
      to,
      error: error.message,
    });
    // Don't throw — forgot-password should always return success
    return { success: false, error: error.message };
  }
}

/**
 * Reset the cached adapter (for testing).
 */
export function _resetAdapter() {
  adapterModule = null;
}
