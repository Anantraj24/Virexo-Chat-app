/**
 * Email templates for verification and password reset.
 * Each template returns { subject, html, text } for dual-format delivery.
 */

export function verificationEmailTemplate({ username, verifyUrl, expiresInHours = 24 }) {
  const subject = 'Verify your Virexo account';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f0f13;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f13;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:#1a1a24;border-radius:12px;border:1px solid #2a2a3a;">
        <tr><td style="padding:40px 32px 24px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">Virexo</h1>
          <p style="margin:0;font-size:14px;color:#8b8ba3;">Secure real-time messaging</p>
        </td></tr>
        <tr><td style="padding:0 32px;">
          <hr style="border:none;border-top:1px solid #2a2a3a;margin:0;">
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#d1d1e0;">Hey <strong style="color:#ffffff;">${username}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#d1d1e0;line-height:1.6;">
            Welcome to Virexo! Please verify your email address to activate your account.
          </p>
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${verifyUrl}" style="display:inline-block;padding:12px 28px;background-color:#6366f1;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
              Verify Email Address
            </a>
          </td></tr></table>
          <p style="margin:24px 0 0;font-size:13px;color:#6b6b80;line-height:1.5;">
            This link expires in <strong>${expiresInHours} hours</strong>. If you didn't create a Virexo account, you can safely ignore this email.
          </p>
        </td></tr>
        <tr><td style="padding:24px 32px 32px;">
          <p style="margin:0;font-size:12px;color:#4a4a5e;">
            Can't click the button? Copy this URL:<br>
            <a href="${verifyUrl}" style="color:#6366f1;word-break:break-all;font-size:12px;">${verifyUrl}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const text = [
    'Virexo — Verify Your Email',
    '',
    `Hey ${username},`,
    '',
    'Welcome to Virexo! Please verify your email address by visiting the link below:',
    '',
    verifyUrl,
    '',
    `This link expires in ${expiresInHours} hours.`,
    '',
    "If you didn't create a Virexo account, you can safely ignore this email.",
  ].join('\n');

  return { subject, html, text };
}

export function passwordResetEmailTemplate({ username, resetUrl, expiresInMinutes = 60 }) {
  const subject = 'Reset your Virexo password';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#0f0f13;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f13;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background-color:#1a1a24;border-radius:12px;border:1px solid #2a2a3a;">
        <tr><td style="padding:40px 32px 24px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">Virexo</h1>
          <p style="margin:0;font-size:14px;color:#8b8ba3;">Password reset request</p>
        </td></tr>
        <tr><td style="padding:0 32px;">
          <hr style="border:none;border-top:1px solid #2a2a3a;margin:0;">
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <p style="margin:0 0 16px;font-size:15px;color:#d1d1e0;">Hey <strong style="color:#ffffff;">${username}</strong>,</p>
          <p style="margin:0 0 24px;font-size:15px;color:#d1d1e0;line-height:1.6;">
            We received a request to reset your Virexo password. Click the button below to choose a new password.
          </p>
          <table cellpadding="0" cellspacing="0"><tr><td>
            <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;background-color:#ef4444;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
              Reset Password
            </a>
          </td></tr></table>
          <p style="margin:24px 0 0;font-size:13px;color:#6b6b80;line-height:1.5;">
            This link expires in <strong>${expiresInMinutes} minutes</strong>. If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.
          </p>
        </td></tr>
        <tr><td style="padding:24px 32px 32px;">
          <p style="margin:0;font-size:12px;color:#4a4a5e;">
            Can't click the button? Copy this URL:<br>
            <a href="${resetUrl}" style="color:#ef4444;word-break:break-all;font-size:12px;">${resetUrl}</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const text = [
    'Virexo — Reset Your Password',
    '',
    `Hey ${username},`,
    '',
    'We received a request to reset your Virexo password. Visit the link below to choose a new password:',
    '',
    resetUrl,
    '',
    `This link expires in ${expiresInMinutes} minutes.`,
    '',
    "If you didn't request a password reset, you can safely ignore this email.",
  ].join('\n');

  return { subject, html, text };
}
