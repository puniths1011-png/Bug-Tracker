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

  try {
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

    if (!response.ok) {
      let errorData = 'Unable to read response';
      try {
        errorData = await response.text();
      } catch (e) {
        console.error('[mailer] Failed to read error response:', e);
      }

      console.error('[mailer] Mail Service rejected invitation:', {
        status: response.status,
        statusText: response.statusText,
        responseBody: errorData,
      });

      throw new Error(`Mail Service returned ${response.status}: ${response.statusText} - ${errorData}`);
    }

    const data = await response.json();
    console.log('[mailer] ✅ Mail Service invitation sent successfully:', data);

    return {
      success: true,
      message: 'Invite sent successfully',
    };
  } catch (error) {
    console.error('[mailer] ❌ Mail Service invitation send failed:');
    console.error({
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
      mailServiceUrl,
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
