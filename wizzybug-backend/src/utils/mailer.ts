/**
 * Mail Service Integration
 * Sends invitations through a separate Mail Service instead of Resend/Gmail
 */

export const isRealMailerConfigured = (): boolean => Boolean(process.env.MAIL_SERVICE_URL);

export const sendInviteViaMail = async (opts: {
  email: string;
  name: string;
  inviteLink: string;
}): Promise<{ success: boolean; message: string }> => {
  const mailServiceUrl = process.env.MAIL_SERVICE_URL?.trim();
  
  if (!mailServiceUrl) {
    throw new Error('MAIL_SERVICE_URL is not configured.');
  }

  const endpoint = `${mailServiceUrl}/send-invite`;
  console.log(`[mailer] Sending invite via Mail Service to=${opts.email} endpoint=${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: opts.email,
        name: opts.name,
        inviteLink: opts.inviteLink,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text().catch(() => 'Unable to read response');
      console.error('[mailer] Mail Service rejected invitation:', {
        status: response.status,
        statusText: response.statusText,
        body: errorData,
      });
      throw new Error(`Mail Service error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[mailer] Mail Service invitation sent to=${opts.email}`, data);

    return {
      success: true,
      message: 'Invite sent successfully',
    };
  } catch (error) {
    console.error('[mailer] Mail Service invitation send failed:', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
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
