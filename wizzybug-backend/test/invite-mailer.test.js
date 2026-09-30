const test = require('node:test');
const assert = require('node:assert/strict');

const envKeys = [
  'MAIL_SERVICE_URL',
  'MAIL_USER',
  'MAIL_PASS',
  'GMAIL_USER',
  'GMAIL_APP_PASSWORD',
  'MAIL_FROM',
  'RESEND_API_KEY',
];
const invite = {
  email: 'invitee@example.com',
  name: 'Jane Doe',
  inviteLink: 'https://app.example.com/accept-invite?token=test-token',
};

const saveEnvironment = () =>
  Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

const restoreEnvironment = (saved) => {
  for (const key of envKeys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
};

const clearMailerEnvironment = () => {
  for (const key of envKeys) delete process.env[key];
};

test('requires a sender address when Resend is configured', async () => {
  const saved = saveEnvironment();
  clearMailerEnvironment();
  process.env.RESEND_API_KEY = 'test-api-key';

  try {
    const { isRealMailerConfigured, sendInviteViaMail } = require('../dist/utils/mailer.js');
    assert.equal(isRealMailerConfigured(), false);
    await assert.rejects(
      sendInviteViaMail(invite),
      /MAIL_FROM must be set to an address on a verified Resend domain/,
    );
  } finally {
    restoreEnvironment(saved);
  }
});

test('sends invites with Resend using the configured sender and multipart content', async () => {
  const saved = saveEnvironment();
  const originalFetch = global.fetch;
  clearMailerEnvironment();
  process.env.RESEND_API_KEY = 'test-api-key';
  process.env.MAIL_FROM = 'WizzyBug <invites@example.com>';
  let request;
  global.fetch = async (url, options) => {
    request = { url: String(url), options };
    return new Response(JSON.stringify({ id: 'email_test' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const { sendInviteViaMail } = require('../dist/utils/mailer.js');
    const result = await sendInviteViaMail(invite);
    const payload = JSON.parse(request.options.body);

    assert.equal(result.success, true);
    assert.equal(result.message, 'Invite sent via Resend');
    assert.match(request.url, /\/emails$/);
    assert.equal(payload.from, process.env.MAIL_FROM);
    assert.equal(payload.to, invite.email);
    assert.equal(payload.reply_to, process.env.MAIL_FROM);
    assert.match(payload.text, /You have been invited to join WizzyBug/);
    assert.match(payload.html, /Accept Invitation/);
  } finally {
    global.fetch = originalFetch;
    restoreEnvironment(saved);
  }
});