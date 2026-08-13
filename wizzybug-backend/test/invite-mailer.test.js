const test = require('node:test');
const assert = require('node:assert/strict');

(async () => {
  delete process.env.RESEND_API_KEY;
  delete process.env.MAIL_FROM;

  const { isRealMailerConfigured, sendMail } = require('../dist/utils/mailer.js');

  test('returns false when no real mailer is configured', async () => {
    assert.equal(await isRealMailerConfigured(), false);
  });

  test('requires a Resend API key before sending', async () => {
    await assert.rejects(
      sendMail({
        to: 'invitee@example.com',
        subject: 'You are invited',
        text: 'Use this link to accept your invite.',
        html: '<p>Use this link to accept your invite.</p>',
      }),
      /RESEND_API_KEY is not configured/
    );
  });
})();
