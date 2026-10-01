const test = require('node:test');
const assert = require('node:assert/strict');

const envKeys = [
  'MAIL_SERVICE_URL',
  'MAIL_USER',
  'MAIL_PASS',
  'GMAIL_USER',
  'GMAIL_APP_PASSWORD',
  'MAIL_FROM',
  'MAIL_REPLY_TO',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
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
      /MAIL_FROM must be set to an address on a verified sending domain/,
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
    assert.match(payload.html, /Accept your invitation/);
    assert.ok(payload.text.includes(invite.inviteLink));
    assert.match(payload.html, new RegExp(invite.inviteLink.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.deepEqual(payload.headers, {
      'Auto-Submitted': 'auto-generated',
      'X-Auto-Response-Suppress': 'All',
    });
  } finally {
    global.fetch = originalFetch;
    restoreEnvironment(saved);
  }
});

test('sends invites over authenticated SMTP with configured sender metadata', async () => {
  const saved = saveEnvironment();
  const nodemailer = require('nodemailer');
  const originalCreateTransport = nodemailer.createTransport;
  clearMailerEnvironment();
  process.env.SMTP_HOST = 'smtp.example.com';
  process.env.SMTP_PORT = '587';
  process.env.SMTP_USER = 'smtp-user@example.com';
  process.env.SMTP_PASS = 'smtp-password';
  process.env.MAIL_FROM = 'WizzyBug <invites@example.com>';
  process.env.MAIL_REPLY_TO = 'support@example.com';
  let transportOptions;
  let sentMessage;
  nodemailer.createTransport = (options) => {
    transportOptions = options;
    return {
      sendMail: async (message) => {
        sentMessage = message;
        return { messageId: 'smtp-test-message' };
      },
    };
  };

  try {
    const { sendInviteViaMail } = require('../dist/utils/mailer.js');
    const result = await sendInviteViaMail(invite);

    assert.equal(result.success, true);
    assert.equal(result.message, 'Invite sent successfully via SMTP');
    assert.deepEqual(transportOptions, {
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: 'smtp-user@example.com',
        pass: 'smtp-password',
      },
    });
    assert.equal(sentMessage.from, process.env.MAIL_FROM);
    assert.equal(sentMessage.replyTo, process.env.MAIL_REPLY_TO);
    assert.equal(sentMessage.to, invite.email);
    assert.ok(sentMessage.text.includes(invite.inviteLink));
    assert.ok(sentMessage.html.includes(`href="${invite.inviteLink}"`));
    assert.deepEqual(sentMessage.headers, {
      'Auto-Submitted': 'auto-generated',
      'X-Auto-Response-Suppress': 'All',
    });
  } finally {
    nodemailer.createTransport = originalCreateTransport;
    restoreEnvironment(saved);
  }
});

test('sends verification emails with a Verify Email link', async () => {
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
    const { sendVerificationEmailViaMail } = require('../dist/utils/mailer.js');
    const verification = {
      email: 'new-user@example.com',
      name: 'Jane Doe',
      verificationLink: 'https://app.example.com/verify-email?token=test-token',
    };
    const result = await sendVerificationEmailViaMail(verification);
    const payload = JSON.parse(request.options.body);

    assert.equal(result.success, true);
    assert.equal(payload.to, verification.email);
    assert.match(payload.subject, /verify/i);
    assert.ok(payload.text.includes(verification.verificationLink));
    assert.match(payload.html, /Verify Email/);
  } finally {
    global.fetch = originalFetch;
    restoreEnvironment(saved);
  }
});