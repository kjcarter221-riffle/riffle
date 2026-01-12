// Email service abstraction
// Supports: Resend, SendGrid, or console logging for development

const emailProvider = process.env.EMAIL_PROVIDER || 'console';

/**
 * Send an email
 * @param {object} options - { to, subject, html, text }
 */
export async function sendEmail({ to, subject, html, text }) {
  switch (emailProvider) {
    case 'resend':
      return sendWithResend({ to, subject, html, text });
    case 'sendgrid':
      return sendWithSendGrid({ to, subject, html, text });
    default:
      return logEmail({ to, subject, html, text });
  }
}

// Console logging for development
async function logEmail({ to, subject, html, text }) {
  console.log('\n========== EMAIL (Dev Mode) ==========');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('Body:', text || html);
  console.log('========================================\n');
  return { success: true, provider: 'console' };
}

// Resend provider
async function sendWithResend({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set, falling back to console');
    return logEmail({ to, subject, html, text });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Riffle <noreply@riffle.app>',
        to,
        subject,
        html,
        text
      })
    });

    if (!response.ok) {
      throw new Error(`Resend API error: ${response.status}`);
    }

    return { success: true, provider: 'resend' };
  } catch (error) {
    console.error('Resend email error:', error);
    return { success: false, error: error.message };
  }
}

// SendGrid provider
async function sendWithSendGrid({ to, subject, html, text }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn('SENDGRID_API_KEY not set, falling back to console');
    return logEmail({ to, subject, html, text });
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: process.env.EMAIL_FROM || 'noreply@riffle.app' },
        subject,
        content: [
          { type: 'text/plain', value: text || html },
          { type: 'text/html', value: html }
        ]
      })
    });

    if (!response.ok && response.status !== 202) {
      throw new Error(`SendGrid API error: ${response.status}`);
    }

    return { success: true, provider: 'sendgrid' };
  } catch (error) {
    console.error('SendGrid email error:', error);
    return { success: false, error: error.message };
  }
}

// Email templates
export function getPasswordResetEmail(resetUrl, userName) {
  const subject = 'Reset your Riffle password';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0ea5e9, #22c55e); padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🎣 Riffle</h1>
      </div>
      <div style="padding: 24px; background: #f8fafc; border-radius: 0 0 12px 12px;">
        <p style="color: #334155; font-size: 16px;">Hi${userName ? ` ${userName}` : ''},</p>
        <p style="color: #334155; font-size: 16px;">
          We received a request to reset your password. Click the button below to create a new password:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background: #0ea5e9; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #64748b; font-size: 14px;">
          This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${resetUrl}" style="color: #0ea5e9;">${resetUrl}</a>
        </p>
      </div>
    </div>
  `;

  const text = `
Reset your Riffle password

Hi${userName ? ` ${userName}` : ''},

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
  `;

  return { subject, html, text };
}
