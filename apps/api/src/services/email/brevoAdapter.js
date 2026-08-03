import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

/**
 * Brevo (Sendinblue) transactional email adapter.
 * Uses the Brevo HTTP API directly via fetch — no SDK dependency.
 */
export async function sendEmail({ to, subject, html, text }) {
  const body = {
    sender: {
      name: env.EMAIL_FROM_NAME,
      email: env.EMAIL_FROM_ADDRESS,
    },
    to: [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text,
  };

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    logger.error('[Email:Brevo] Failed to send email', {
      status: response.status,
      error: errorBody,
      to,
      subject,
    });
    throw new Error(`Brevo email delivery failed: ${response.status}`);
  }

  const data = await response.json();
  logger.info('[Email:Brevo] Email sent successfully', {
    to,
    subject,
    messageId: data.messageId,
  });

  return { success: true, provider: 'brevo', messageId: data.messageId };
}
