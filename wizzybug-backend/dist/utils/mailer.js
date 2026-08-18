"use strict";
/**
 * Mail Service Integration
 * Sends invitations through a separate Mail Service instead of Resend/Gmail
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = exports.sendInviteViaMail = exports.isRealMailerConfigured = void 0;
const isRealMailerConfigured = () => Boolean(process.env.MAIL_SERVICE_URL);
exports.isRealMailerConfigured = isRealMailerConfigured;
const sendInviteViaMail = (opts) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const mailServiceUrl = (_a = process.env.MAIL_SERVICE_URL) === null || _a === void 0 ? void 0 : _a.trim();
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
        const response = yield fetch(mailServiceUrl, {
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
                errorData = yield response.text();
            }
            catch (e) {
                console.error('[mailer] Failed to read error response:', e);
            }
            console.error('[mailer] Mail Service rejected invitation:', {
                status: response.status,
                statusText: response.statusText,
                responseBody: errorData,
            });
            throw new Error(`Mail Service returned ${response.status}: ${response.statusText} - ${errorData}`);
        }
        const data = yield response.json();
        console.log('[mailer] ✅ Mail Service invitation sent successfully:', data);
        return {
            success: true,
            message: 'Invite sent successfully',
        };
    }
    catch (error) {
        console.error('[mailer] ❌ Mail Service invitation send failed:');
        console.error({
            errorName: error instanceof Error ? error.name : 'UnknownError',
            errorMessage: error instanceof Error ? error.message : String(error),
            mailServiceUrl,
        });
        throw error;
    }
});
exports.sendInviteViaMail = sendInviteViaMail;
/**
 * Legacy sendMail function (kept for backwards compatibility)
 * Use sendInviteViaMail for sending invitations instead
 */
const sendMail = (opts) => __awaiter(void 0, void 0, void 0, function* () {
    throw new Error('sendMail is no longer supported. Use sendInviteViaMail with the Mail Service instead.');
});
exports.sendMail = sendMail;
