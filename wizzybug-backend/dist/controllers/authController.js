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
exports.acceptInvite = exports.inviteUser = exports.loginUser = exports.registerUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const User_1 = __importDefault(require("../models/User"));
const mailer_1 = require("../utils/mailer");
const ALLOWED_ROLES = ['admin', 'developer', 'tester'];
const normalizeEmail = (value) => value.trim().toLowerCase();
const getFrontendUrl = () => {
    return process.env.FRONTEND_URL || process.env.CLIENT_URL || process.env.VITE_APP_URL || 'http://localhost:5173';
};
const generateToken = (id) => {
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET || 'secret');
};
const registerUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password, role } = req.body;
        if (role && !ALLOWED_ROLES.includes(role)) {
            res.status(400).json({ message: 'Role must be one of: admin, developer, tester' });
            return;
        }
        const userExists = yield User_1.default.findOne({ email });
        if (userExists) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hashedPassword = yield bcryptjs_1.default.hash(password, salt);
        const user = yield User_1.default.create({
            name,
            email,
            password: hashedPassword,
            role: role || 'developer'
        });
        if (user) {
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user.id),
            });
        }
        else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
exports.registerUser = registerUser;
const loginUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const user = yield User_1.default.findOne({ email });
        if (user && user.password && (yield bcryptjs_1.default.compare(password, user.password))) {
            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user.id),
            });
        }
        else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
exports.loginUser = loginUser;
const inviteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, role } = req.body;
        const normalizedEmail = normalizeEmail(email);
        if (role && !ALLOWED_ROLES.includes(role)) {
            res.status(400).json({ message: 'Role must be one of: admin, developer, tester' });
            return;
        }
        const userExists = yield User_1.default.findOne({ email: normalizedEmail });
        if (userExists) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }
        const inviteToken = (0, uuid_1.v4)();
        const user = yield User_1.default.create({
            name,
            email: normalizedEmail,
            role: role || 'developer',
            status: 'pending',
            inviteToken
        });
        const frontendUrl = getFrontendUrl();
        const inviteUrl = `${frontendUrl}/accept-invite?token=${inviteToken}`;
        try {
            yield (0, mailer_1.sendMail)({
                to: normalizedEmail,
                subject: 'You have been invited to WizzyBug',
                text: `Hello ${name},\n\nYou have been invited to join WizzyBug as a ${role || 'developer'}.\nUse the link below to accept your invitation and set your password for ${normalizedEmail}:\n\n${inviteUrl}\n\nThanks,\nWizzyBug Team`,
                html: `<p>Hello ${name},</p><p>You have been invited to join <b>WizzyBug</b> as a <b>${role || 'developer'}</b>.</p><p>Invitation email: <b>${normalizedEmail}</b></p><p><a href="${inviteUrl}">Click here to accept your invitation and set your password</a></p><p>If the button doesn't work, copy this link into your browser:<br/>${inviteUrl}</p>`
            });
        }
        catch (mailErr) {
            // Roll back the pending user if the email genuinely could not be sent,
            // so an admin doesn't end up with a "ghost" invite the person never received.
            const reason = mailErr instanceof Error ? mailErr.message : 'Unknown mail error';
            console.error('[inviteUser] Failed to send invite email:', mailErr);
            yield User_1.default.deleteOne({ _id: user._id });
            res.status(502).json({
                message: 'Invite could not be emailed.',
                reason,
                hint: 'On Render, configure RESEND_API_KEY and MAIL_FROM. For Resend testing without a custom domain, use "WizzyBug Admin" <onboarding@resend.dev>.'
            });
            return;
        }
        const mailerReady = (0, mailer_1.isRealMailerConfigured)();
        res.status(201).json({
            message: mailerReady ? 'Invite sent' : 'Invite created, but no real mailer is configured. Email preview details are in the backend console.',
            mailMode: mailerReady ? 'real' : 'preview',
            user: { name: user.name, email: user.email, role: user.role, status: user.status }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.inviteUser = inviteUser;
const acceptInvite = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token, password } = req.body;
        const user = yield User_1.default.findOne({ inviteToken: token, status: 'pending' });
        if (!user) {
            res.status(400).json({ message: 'Invalid or expired invite token' });
            return;
        }
        const salt = yield bcryptjs_1.default.genSalt(10);
        const hashedPassword = yield bcryptjs_1.default.hash(password, salt);
        user.password = hashedPassword;
        user.status = 'active';
        user.inviteToken = undefined;
        yield user.save();
        res.json({
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id),
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
exports.acceptInvite = acceptInvite;
