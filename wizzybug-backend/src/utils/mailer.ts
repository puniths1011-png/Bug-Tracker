import { Resend } from 'resend';

const DEFAULT_FROM = '"WizzyBug Admin" <onboarding@resend.dev>';

const getFromAddress = (): string => process.env.MAIL_FROM?.trim() || DEFAULT_FROM;

const getResendClient = (): Resend => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured.');
  return new Resend(apiKey);
};

export const isRealMailerConfigured = (): boolean => Boolean(process.env.RESEND_API_KEY);

export const sendMail = async (opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ id: string }> => {
  const resend = getResendClient();
  const from = getFromAddress();
  console.log(`[mailer] Sending Resend email to=${opts.to} from=${from}`);

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [opts.to],
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });

    if (error) {
      console.error('[mailer] Resend API rejected email:', {
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
      });
      throw new Error(`Resend API error: ${error.message}`);
    }
    if (!data?.id) {
      console.error('[mailer] Resend API returned no email id:', data);
      throw new Error('Resend API did not return an email id.');
    }

    console.log(`[mailer] Resend email accepted id=${data.id} to=${opts.to}`);
    return { id: data.id };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Resend API error:')) throw error;
    console.error('[mailer] Resend email send failed:', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};
