import nodemailer from "nodemailer";

let cachedTransporter: any = null;
let cachedIsRealSmtp = false;

const hasResendConfig = (): boolean => Boolean(process.env.RESEND_API_KEY);

/**
 * Returns a nodemailer transporter.
 *
 * If GMAIL_USER + GMAIL_APP_PASSWORD are configured, Gmail SMTP is used. This is
 * the preferred flow for hosted deployments because it avoids blocked outbound
 * SMTP ports and uses a real Gmail account with an App Password.
 */
export const getTransporter = async (): Promise<{
  transporter: any;
  isReal: boolean;
}> => {
  if (cachedTransporter) {
    return { transporter: cachedTransporter, isReal: cachedIsRealSmtp };
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (gmailUser && gmailPass) {
    cachedTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    } as any);
    cachedIsRealSmtp = true;
    return { transporter: cachedTransporter, isReal: true };
  }

  // Prefer SendGrid if an API key is provided (works well on hosted platforms).
  const sendgridKey = process.env.SENDGRID_API_KEY;
  if (sendgridKey) {
    // Use SendGrid's SMTP relay with the 'apikey' user.
    cachedTransporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      secure: false,
      auth: { user: 'apikey', pass: sendgridKey },
      family: 4,
    } as any);
    cachedIsRealSmtp = true;
    return { transporter: cachedTransporter, isReal: true };
  }

  // Generic SMTP fallback, e.g. Outlook / a company mail server.
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    } as any);
    cachedIsRealSmtp = true;
    return { transporter: cachedTransporter, isReal: true };
  }

  if (hasResendConfig()) {
    cachedTransporter = nodemailer.createTransport({
      jsonTransport: true,
    } as any);
    cachedIsRealSmtp = true;
    return { transporter: cachedTransporter, isReal: true };
  }

  // When no real mailer is configured, use a temporary test inbox so the app
  // can still generate an invite link for previewing without breaking the flow.
  const testAccount = await nodemailer.createTestAccount();
  cachedTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  } as any);
  cachedIsRealSmtp = false;
  return { transporter: cachedTransporter, isReal: false };
};

const normalizeFromAddress = (value?: string): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

export const getFromAddress = (): string => {
  // Gmail only permits messages to be sent from the authenticated mailbox (or
  // from an alias configured in that mailbox). A generic MAIL_FROM value such
  // as no-reply@... causes Gmail to reject the message, which surfaced as a
  // 502 from the invite endpoint. Keep the product name as the display name
  // but use the Gmail account itself as the actual sender.
  const gmailUser = normalizeFromAddress(process.env.GMAIL_USER);
  if (gmailUser && process.env.GMAIL_APP_PASSWORD && !hasResendConfig()) {
    return `"WizzyBug Admin" <${gmailUser}>`;
  }

  return (
    normalizeFromAddress(process.env.MAIL_FROM) ||
    '"WizzyBug Admin" <no-reply@wizzybug.app>'
  );
};

export const isRealMailerConfigured = async (): Promise<boolean> => {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) return true;
  if (process.env.SENDGRID_API_KEY) return true;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return true;
  if (hasResendConfig()) return true;

  const { isReal } = await getTransporter();
  return isReal;
};

export const sendMail = async (opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) => {
  const gmailConfigured = Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
  const sendgridConfigured = Boolean(process.env.SENDGRID_API_KEY);
  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

  if (gmailConfigured || sendgridConfigured || smtpConfigured) {
    const { transporter, isReal } = await getTransporter();
    const provider = gmailConfigured ? 'gmail' : sendgridConfigured ? 'sendgrid' : 'smtp';

    console.log(`[mailer] sendMail start provider=${provider} isReal=${isReal} to=${opts.to}`);

    try {
      const info = await transporter.sendMail({
        from: getFromAddress(),
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      });

      console.log(`[mailer] Email sent to ${opts.to}: ${info.messageId}`);
      console.log('[mailer] sendMail result info:', info);

      return {
        ...info,
        mode: 'real',
        previewUrl: null,
      };
    } catch (mailErr) {
      console.error('[mailer] sendMail error:', mailErr);
      throw mailErr;
    }
  }

  if (hasResendConfig()) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: getFromAddress(),
        to: [opts.to],
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Resend API error (${response.status}): ${detail}`);
    }

    const info = await response.json();
    console.log(`[mailer] Email sent through Resend to ${opts.to}: ${info.id}`);
    return info;
  }

  const { transporter, isReal } = await getTransporter();
  console.log(`[mailer] sendMail start provider=ethereal isReal=${isReal} to=${opts.to}`);

  try {
    const info = await transporter.sendMail({
      from: getFromAddress(),
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('[mailer] Preview URL (Ethereal, not a real inbox):', previewUrl);
    console.log('[mailer] sendMail result info:', info);

    return {
      ...info,
      mode: 'preview',
      previewUrl,
    };
  } catch (mailErr) {
    console.error('[mailer] sendMail error:', mailErr);
    throw mailErr;
  }
};
