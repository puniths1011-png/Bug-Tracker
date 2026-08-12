import nodemailer from "nodemailer";

let cachedTransporter: any = null;
let cachedIsRealSmtp = false;

const hasResendConfig = (): boolean => Boolean(process.env.RESEND_API_KEY);

/**
 * Returns a nodemailer transporter.
 *
 * If GMAIL_USER + GMAIL_APP_PASSWORD are set in the environment, real emails are
 * sent through Gmail using an App Password (https://myaccount.google.com/apppasswords).
 * Otherwise falls back to an Ethereal test inbox so the app keeps working in dev
 * without any email config -- the preview link is printed to the server console.
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

  if (gmailUser && gmailPass) {
    cachedTransporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
      family: 4,
    } as any);
    cachedIsRealSmtp = true;
    return { transporter: cachedTransporter, isReal: true };
  }

  // Generic SMTP fallback, e.g. SendGrid / Outlook / a company mail server.
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

  // If no real mailer is configured, fail loudly — do not use a mock inbox.
  throw new Error(
    'No real mailer configured. Set SENDGRID_API_KEY or GMAIL_USER+GMAIL_APP_PASSWORD or SMTP_* env vars.',
  );
};

// Note: Ethereal/mock transport intentionally removed — require real mailer credentials.

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
    return `"WizzyBug" <${gmailUser}>`;
  }

  return (
    normalizeFromAddress(process.env.MAIL_FROM) ||
    '"WizzyBug" <no-reply@wizzybug.app>'
  );
};

export const isRealMailerConfigured = async (): Promise<boolean> => {
  // Resend's HTTPS API works on hosts that block outbound SMTP connections,
  // including Render's free web services.
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
  // Prefer an HTTPS email API when configured. This avoids SMTP ports 465 and
  // 587, which Render blocks for free web services and which otherwise cause
  // the invitation request to time out with a 502.
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
  const provider = process.env.SENDGRID_API_KEY
    ? 'sendgrid'
    : process.env.GMAIL_USER
    ? 'gmail'
    : process.env.SMTP_HOST
    ? 'smtp'
    : 'ethereal';

  console.log(`[mailer] sendMail start provider=${provider} isReal=${isReal} to=${opts.to}`);

  try {
    const info = await transporter.sendMail({
      from: getFromAddress(),
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });

    if (!isReal) {
      console.log(
        "[mailer] Preview URL (Ethereal, not a real inbox):",
        nodemailer.getTestMessageUrl(info),
      );
    } else {
      console.log(`[mailer] Email sent to ${opts.to}: ${info.messageId}`);
    }

    console.log('[mailer] sendMail result info:', info);

    return info;
  } catch (mailErr) {
    console.error('[mailer] sendMail error:', mailErr);
    throw mailErr;
  }
};
