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

  // Ensure URL doesn't have trailing slash for endpoint construction
  const baseUrl = mailServiceUrl.endsWith('/') ? mailServiceUrl.slice(0, -1) : mailServiceUrl;
  const endpoint = `${baseUrl}/send-invite`;
  
  console.log('[mailer] Configuration check:');
  console.log(`  - MAIL_SERVICE_URL: ${mailServiceUrl}`);
  console.log(`  - Endpoint: ${endpoint}`);
  console.log(`  - Email: ${opts.email}`);
  console.log(`  - Name: ${opts.name}`);

  try {
    console.log('[mailer] Making request to Mail Service...');
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
      timeout: 10000, // 10 second timeout
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
    console.log(`[mailer] ✅ Mail Service invitation sent successfully:`, data);

    return {
      success: true,
      message: 'Invite sent successfully',
    };
  } catch (error) {
    console.error('[mailer] ❌ Mail Service invitation send failed:');
    console.error({
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
      endpoint,
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
