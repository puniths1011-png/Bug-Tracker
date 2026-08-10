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
exports.sendMail = exports.isRealMailerConfigured = exports.getFromAddress = exports.getTransporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
let cachedTransporter = null;
let cachedIsRealSmtp = false;
/**
 * Returns a nodemailer transporter.
 *
 * If GMAIL_USER + GMAIL_APP_PASSWORD are set in the environment, real emails are
 * sent through Gmail using an App Password (https://myaccount.google.com/apppasswords).
 * Otherwise falls back to an Ethereal test inbox so the app keeps working in dev
 * without any email config -- the preview link is printed to the server console.
 */
const getTransporter = () => __awaiter(void 0, void 0, void 0, function* () {
    if (cachedTransporter) {
        return { transporter: cachedTransporter, isReal: cachedIsRealSmtp };
    }
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    if (gmailUser && gmailPass) {
        cachedTransporter = nodemailer_1.default.createTransport({
            service: 'gmail',
            auth: {
                user: gmailUser,
                pass: gmailPass
            }
        });
        cachedIsRealSmtp = true;
        return { transporter: cachedTransporter, isReal: true };
    }
    // Generic SMTP fallback, e.g. SendGrid / Outlook / a company mail server.
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        cachedTransporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
        cachedIsRealSmtp = true;
        return { transporter: cachedTransporter, isReal: true };
    }
    console.warn('[mailer] No GMAIL_USER/GMAIL_APP_PASSWORD or SMTP_* env vars set. ' +
        'Falling back to an Ethereal test inbox -- emails will NOT reach real addresses. ' +
        'Set GMAIL_USER and GMAIL_APP_PASSWORD in your .env to send real emails.');
    const testAccount = yield nodemailer_1.default.createTestAccount();
    cachedTransporter = nodemailer_1.default.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass }
    });
    cachedIsRealSmtp = false;
    return { transporter: cachedTransporter, isReal: false };
});
exports.getTransporter = getTransporter;
const getFromAddress = () => {
    return process.env.MAIL_FROM || process.env.GMAIL_USER || '"WizzyBug" <no-reply@wizzyBug.com>';
};
exports.getFromAddress = getFromAddress;
const isRealMailerConfigured = () => __awaiter(void 0, void 0, void 0, function* () {
    const { isReal } = yield (0, exports.getTransporter)();
    return isReal;
});
exports.isRealMailerConfigured = isRealMailerConfigured;
const sendMail = (opts) => __awaiter(void 0, void 0, void 0, function* () {
    const { transporter, isReal } = yield (0, exports.getTransporter)();
    const info = yield transporter.sendMail({
        from: (0, exports.getFromAddress)(),
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html
    });
    if (!isReal) {
        console.log('[mailer] Preview URL (Ethereal, not a real inbox):', nodemailer_1.default.getTestMessageUrl(info));
    }
    else {
        console.log(`[mailer] Email sent to ${opts.to}: ${info.messageId}`);
    }
    return info;
});
exports.sendMail = sendMail;
