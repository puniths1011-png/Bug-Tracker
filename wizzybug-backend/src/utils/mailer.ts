import nodemailer from "nodemailer";

let cachedTransporter: any = null;
let cachedIsRealSmtp = false;

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
  return (
    normalizeFromAddress(process.env.MAIL_FROM) ||
    normalizeFromAddress(process.env.GMAIL_USER) ||
    '"WizzyBug" <no-reply@wizzyBug.com>'
  );
};

export const isRealMailerConfigured = async (): Promise<boolean> => {
  const { isReal } = await getTransporter();
  return isReal;
};

export const sendMail = async (opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) => {
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
