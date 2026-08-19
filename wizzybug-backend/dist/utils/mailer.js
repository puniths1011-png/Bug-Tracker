"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = exports.sendInviteViaMail = exports.isRealMailerConfigured = exports.resolveMailServiceUrl = void 0;
/**
 * Mail Service Integration
 * Tries the deployed mail endpoint first and falls back to Gmail SMTP if the external service is unavailable.
 */
const nodemailer_1 = __importDefault(require("nodemailer"));
const resolveMailServiceUrl = () => {
    var _a;
    const configuredUrl = (_a = process.env.MAIL_SERVICE_URL) === null || _a === void 0 ? void 0 : _a.trim();
    return configuredUrl || '';
};
exports.resolveMailServiceUrl = resolveMailServiceUrl;
const getSmtpTransport = () => {
    var _a, _b;
    const mailUser = (_a = (process.env.MAIL_USER || process.env.GMAIL_USER)) === null || _a === void 0 ? void 0 : _a.trim();
    const mailPassword = (_b = (process.env.MAIL_PASS || process.env.GMAIL_APP_PASSWORD)) === null || _b === void 0 ? void 0 : _b.trim();
    if (!mailUser || !mailPassword) {
        return null;
    }
    return nodemailer_1.default.createTransport({
        service: 'gmail',
        auth: {
            user: mailUser,
            pass: mailPassword,
        },
    });
};
const isRealMailerConfigured = () => Boolean((0, exports.resolveMailServiceUrl)()) || Boolean(getSmtpTransport());
exports.isRealMailerConfigured = isRealMailerConfigured;
const sendInviteViaMail = (opts) => __awaiter(void 0, void 0, void 0, function* () {
    const mailServiceUrl = (0, exports.resolveMailServiceUrl)();
    const smtpTransport = getSmtpTransport();
    if (!mailServiceUrl && !smtpTransport) {
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
    let mailServiceError = null;
    try {
        if (mailServiceUrl) {
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
            if (response.ok) {
                const data = yield response.json();
                console.log('[mailer] ✅ Mail Service invitation sent successfully:', data);
                return {
                    success: true,
                    message: 'Invite sent successfully',
                };
            }
            let errorData = 'Unable to read response';
            try {
                errorData = yield response.text();
            }
            catch (e) {
                console.error('[mailer] Failed to read error response:', e);
            }
            mailServiceError = new Error(`Mail Service returned ${response.status}: ${response.statusText} - ${errorData}`);
            console.error('[mailer] Mail Service rejected invitation:', {
                status: response.status,
                statusText: response.statusText,
                responseBody: errorData,
            });
        }
    }
    catch (error) {
        mailServiceError = error instanceof Error ? error : new Error(String(error));
        console.error('[mailer] ❌ Mail Service invitation send failed:');
        console.error({
            errorName: mailServiceError.name,
            errorMessage: mailServiceError.message,
            mailServiceUrl,
        });
    }
    if (smtpTransport) {
        try {
            const info = yield smtpTransport.sendMail({
                from: process.env.MAIL_FROM || process.env.MAIL_USER || process.env.GMAIL_USER,
                to: opts.email,
                subject,
                text: body,
                html,
            });
            console.log('[mailer] ✅ SMTP fallback invitation sent successfully:', info.messageId);
            return {
                success: true,
                message: 'Invite sent successfully via SMTP fallback',
            };
        }
        catch (smtpError) {
            const fallbackError = smtpError instanceof Error ? smtpError : new Error(String(smtpError));
            console.error('[mailer] ❌ SMTP fallback send failed:', fallbackError);
            if (mailServiceError) {
                throw mailServiceError;
            }
            throw fallbackError;
        }
    }
    if (mailServiceError) {
        throw mailServiceError;
    }
    throw new Error('No mail transport is configured.');
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
