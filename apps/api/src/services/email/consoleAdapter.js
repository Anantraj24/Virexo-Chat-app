import { logger } from '../../utils/logger.js';

/**
 * Console email adapter for local development and testing.
 * Logs email details to structured console output.
 * Never logs raw token values — only the full URL.
 */
export async function sendEmail({ to, subject, html: _html, text }) {
  logger.info(`[Email:Console] Sending email`, {
    to,
    subject,
    preview: text.substring(0, 120).replace(/\n/g, ' '),
  });

  // In test environment, keep output minimal
  return { success: true, provider: 'console', messageId: `console-${Date.now()}` };
}
