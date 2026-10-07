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

const saveEnvironment = () =>
  Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

const restoreEnvironment = (saved) => {
  for (const key of envKeys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
};

test('assignment emails display mapped P1 and P2 priorities in text and HTML', async () => {
  const saved = saveEnvironment();
  const originalFetch = global.fetch;
  for (const key of envKeys) delete process.env[key];
  process.env.MAIL_SERVICE_URL = 'https://mail.example.com/api/index';

  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url: String(url), payload: JSON.parse(options.body) });
    return new Response('{}', { status: 200 });
  };

  try {
    const { sendBugAssignmentEmail } = require('../dist/utils/mailer.js');
    const baseOptions = {
      to: 'assignee@example.com',
      assigneeName: 'Assignee',
      assignedBy: 'Reporter',
      bugId: 'BUG-01',
      title: 'Example bug',
      description: 'Description',
      projectName: 'Example project',
      severity: 'Critical',
      appUrl: 'https://app.example.com',
    };

    await sendBugAssignmentEmail({ ...baseOptions, priority: 'critical' });
    await sendBugAssignmentEmail({ ...baseOptions, priority: 'high' });

    assert.match(requests[0].payload.body, /Priority: P1-Immediate Fix/);
    assert.match(requests[0].payload.html, /<b>Priority<\/b><\/td><td>P1-Immediate Fix<\/td>/);
    assert.match(requests[1].payload.body, /Priority: P2-High/);
    assert.match(requests[1].payload.html, /<b>Priority<\/b><\/td><td>P2-High<\/td>/);
  } finally {
    global.fetch = originalFetch;
    restoreEnvironment(saved);
  }
});
