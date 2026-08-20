/**
 * Mail Service Integration
 * Tries the deployed mail endpoint first and falls back to Gmail SMTP if the external service is unavailable.
 */
import nodemailer from 'nodemailer';

export const resolveMailServiceUrl = (): string => {
  const configuredUrl = process.env.MAIL_SERVICE_URL?.trim().replace(/\/+$/, '');
  if (!configuredUrl) return '';

  // The deployed mail service exposes its handler at /api/index. Accepting
  // the shorter /api value avoids silently posting to the Vercel directory.
  if (configuredUrl.endsWith('/api')) return `${configuredUrl}/index`;
  return configuredUrl;
};

const getSmtpTransport = () => {
  const mailUser = (process.env.MAIL_USER || process.env.GMAIL_USER)?.trim();
  const mailPassword = (process.env.MAIL_PASS || process.env.GMAIL_APP_PASSWORD)?.trim();

  if (!mailUser || !mailPassword) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: mailUser,
      pass: mailPassword,
    },
  });
};

export const isRealMailerConfigured = (): boolean => Boolean(resolveMailServiceUrl()) || Boolean(getSmtpTransport());

export const sendInviteViaMail = async (opts: {
  email: string;
  name: string;
  inviteLink: string;
}): Promise<{ success: boolean; message: string }> => {
  const mailServiceUrl = resolveMailServiceUrl();
  const smtpTransport = getSmtpTransport();

  if (!mailServiceUrl && !smtpTransport) {
    const msg = 'MAIL_SERVICE_URL is not configured. Set it in your environment variables.';
    console.error('[mailer] Error:', msg);
    throw new Error(msg);
  }

  const subject = 'You are invited to WizzyBug';
  const body = `Hello ${opts.name},

You have been invited to join WizzyBug.

Please accept your invitation using the link below:

${opts.inviteLink}

Thank you,
WizzyBug Team`;

  const html = `
    <h2>Hello ${opts.name},</h2>
    <p>You have been invited to join <strong>WizzyBug</strong>.</p>
    <p>Please click the link below to accept your invitation:</p>
    <p>
      <a href="${opts.inviteLink}">
        Accept Invitation
      </a>
    </p>
    <p>Thank you,<br>WizzyBug Team</p>
  `;

  console.log('[mailer] Configuration check:');
  console.log(`  - MAIL_SERVICE_URL: ${mailServiceUrl}`);
  console.log(`  - Email: ${opts.email}`);
  console.log(`  - Subject: ${subject}`);

  let mailServiceError: Error | null = null;

  try {
    if (mailServiceUrl) {
      const response = await fetch(mailServiceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: opts.email,
          subject,
          body,
          html,
        }),
      });

      console.log(`[mailer] Mail Service responded with status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log('[mailer] ✅ Mail Service invitation sent successfully:', data);

        return {
          success: true,
          message: 'Invite sent successfully',
        };
      }

      let errorData = 'Unable to read response';
      try {
        errorData = await response.text();
      } catch (e) {
        console.error('[mailer] Failed to read error response:', e);
      }

      mailServiceError = new Error(`Mail Service returned ${response.status}: ${response.statusText} - ${errorData}`);
      console.error('[mailer] Mail Service rejected invitation:', {
        status: response.status,
        statusText: response.statusText,
        responseBody: errorData,
      });
    }
  } catch (error) {
    mailServiceError = error instanceof Error ? error : new Error(String(error));
    console.error('[mailer] ❌ Mail Service invitation send failed:');
    console.error({
      errorName: mailServiceError.name,
      errorMessage: mailServiceError.message,
      mailServiceUrl,
    });
  }

  if (smtpTransport) {
    try {
      const info = await smtpTransport.sendMail({
        from: process.env.MAIL_FROM || process.env.MAIL_USER || process.env.GMAIL_USER,
        to: opts.email,
        subject,
        text: body,
        html,
      });

      console.log('[mailer] ✅ SMTP fallback invitation sent successfully:', info.messageId);
      return {
        success: true,
        message: 'Invite sent successfully via SMTP fallback',
      };
    } catch (smtpError) {
      const fallbackError = smtpError instanceof Error ? smtpError : new Error(String(smtpError));
      console.error('[mailer] ❌ SMTP fallback send failed:', fallbackError);

      if (mailServiceError) {
        throw mailServiceError;
      }

      throw fallbackError;
    }
  }

  if (mailServiceError) {
    throw mailServiceError;
  }

  throw new Error('No mail transport is configured.');
};

/**
 * Legacy sendMail function (kept for backwards compatibility)
 * Use sendInviteViaMail for sending invitations instead
 */
export const sendMail = async (opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ id: string }> => {
  throw new Error(
    'sendMail is no longer supported. Use sendInviteViaMail with the Mail Service instead.'
  );
};
