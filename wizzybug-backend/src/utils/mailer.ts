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

  console.warn(
    "[mailer] No GMAIL_USER/GMAIL_APP_PASSWORD or SMTP_* env vars set. " +
      "Falling back to an Ethereal test inbox -- emails will NOT reach real addresses. " +
      "Set GMAIL_USER and GMAIL_APP_PASSWORD in your .env to send real emails.",
  );
  const testAccount = await nodemailer.createTestAccount();
  cachedTransporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  cachedIsRealSmtp = false;
  return { transporter: cachedTransporter, isReal: false };
};

const createEtherealTransporter = async () => {
  const testAccount = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  return { transporter, testAccount };
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

    return info;
  } catch (mailErr) {
    if (isReal) {
      console.error(
        '[mailer] Real mailer failed, falling back to Ethereal preview:',
        mailErr,
      );
      cachedTransporter = null;

      const { transporter: fallbackTransporter } = await createEtherealTransporter();
      const fallbackInfo = await fallbackTransporter.sendMail({
        from: getFromAddress(),
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      });

      console.log(
        "[mailer] Fallback preview URL (Ethereal, invitation not sent to real inbox):",
        nodemailer.getTestMessageUrl(fallbackInfo),
      );
      return fallbackInfo;
    }

    throw mailErr;
  }
};
