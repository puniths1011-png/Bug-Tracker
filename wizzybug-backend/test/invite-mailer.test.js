const test = require('node:test');
const assert = require('node:assert/strict');

(async () => {
  delete process.env.RESEND_API_KEY;
  delete process.env.SENDGRID_API_KEY;
  delete process.env.GMAIL_USER;
  delete process.env.GMAIL_APP_PASSWORD;
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_SECURE;
  delete process.env.MAIL_FROM;

  const { isRealMailerConfigured, sendMail } = require('../dist/utils/mailer.js');

  test('returns false when no real mailer is configured', async () => {
    assert.equal(await isRealMailerConfigured(), false);
  });

  test('falls back to preview payload instead of throwing', async () => {
    const result = await sendMail({
      to: 'invitee@example.com',
      subject: 'You are invited',
      text: 'Use this link to accept your invite.',
      html: '<p>Use this link to accept your invite.</p>',
    });

    assert.ok(result);
    assert.equal(result.mode, 'preview');
    assert.ok(result.previewUrl);
  });
})();
