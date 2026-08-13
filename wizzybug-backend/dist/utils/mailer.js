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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = exports.isRealMailerConfigured = void 0;
const resend_1 = require("resend");
const DEFAULT_FROM = '"WizzyBug Admin" <onboarding@resend.dev>';
const getFromAddress = () => { var _a; return ((_a = process.env.MAIL_FROM) === null || _a === void 0 ? void 0 : _a.trim()) || DEFAULT_FROM; };
const getResendClient = () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey)
        throw new Error('RESEND_API_KEY is not configured.');
    return new resend_1.Resend(apiKey);
};
const isRealMailerConfigured = () => Boolean(process.env.RESEND_API_KEY);
exports.isRealMailerConfigured = isRealMailerConfigured;
const sendMail = (opts) => __awaiter(void 0, void 0, void 0, function* () {
    const resend = getResendClient();
    const from = getFromAddress();
    console.log(`[mailer] Sending Resend email to=${opts.to} from=${from}`);
    try {
        const { data, error } = yield resend.emails.send({
            from,
            to: [opts.to],
            subject: opts.subject,
            text: opts.text,
            html: opts.html,
        });
        if (error) {
            console.error('[mailer] Resend API rejected email:', {
                name: error.name,
                message: error.message,
                statusCode: error.statusCode,
            });
            throw new Error(`Resend API error: ${error.message}`);
        }
        if (!(data === null || data === void 0 ? void 0 : data.id)) {
            console.error('[mailer] Resend API returned no email id:', data);
            throw new Error('Resend API did not return an email id.');
        }
        console.log(`[mailer] Resend email accepted id=${data.id} to=${opts.to}`);
        return { id: data.id };
    }
    catch (error) {
        if (error instanceof Error && error.message.startsWith('Resend API error:'))
            throw error;
        console.error('[mailer] Resend email send failed:', {
            name: error instanceof Error ? error.name : 'UnknownError',
            message: error instanceof Error ? error.message : String(error),
        });
        throw error;
    }
});
exports.sendMail = sendMail;
