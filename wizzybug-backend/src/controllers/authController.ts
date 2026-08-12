import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User';
import { isRealMailerConfigured, sendMail } from '../utils/mailer';

const ALLOWED_ROLES = ['admin', 'developer', 'tester'];

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const getFrontendUrl = (): string => {
  return process.env.FRONTEND_URL || process.env.CLIENT_URL || process.env.VITE_APP_URL || 'http://localhost:5173';
};

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret')
};

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    if (role && !ALLOWED_ROLES.includes(role)) {
      res.status(400).json({ message: 'Role must be one of: admin, developer, tester' });
      return;
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
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
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && user.password && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const inviteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, role } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (role && !ALLOWED_ROLES.includes(role)) {
      res.status(400).json({ message: 'Role must be one of: admin, developer, tester' });
      return;
    }

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const inviteToken = uuidv4();

    const user = await User.create({
      name,
      email: normalizedEmail,
      role: role || 'developer',
      status: 'pending',
      inviteToken
    });

    const frontendUrl = getFrontendUrl();
    const inviteUrl = `${frontendUrl}/accept-invite?token=${inviteToken}`;

    try {
      await sendMail({
        to: normalizedEmail,
        subject: 'You have been invited to WizzyBug',
        text: `Hello ${name},\n\nYou have been invited to join WizzyBug as a ${role || 'developer'}.\nUse the link below to accept your invitation and set your password for ${normalizedEmail}:\n\n${inviteUrl}\n\nThanks,\nWizzyBug Team`,
        html: `<p>Hello ${name},</p><p>You have been invited to join <b>WizzyBug</b> as a <b>${role || 'developer'}</b>.</p><p>Invitation email: <b>${normalizedEmail}</b></p><p><a href="${inviteUrl}">Click here to accept your invitation and set your password</a></p><p>If the button doesn't work, copy this link into your browser:<br/>${inviteUrl}</p>`
      });
    } catch (mailErr) {
      // Roll back the pending user if the email genuinely could not be sent,
      // so an admin doesn't end up with a "ghost" invite the person never received.
      const reason = mailErr instanceof Error ? mailErr.message : 'Unknown mail error';
      console.error('[inviteUser] Failed to send invite email:', mailErr);
      await User.deleteOne({ _id: user._id });
      res.status(502).json({
        message: 'Invite could not be emailed.',
        reason,
        hint: 'On Render free instances, configure RESEND_API_KEY and a verified MAIL_FROM address. Otherwise use valid GMAIL_USER/GMAIL_APP_PASSWORD or SMTP_* values on a plan that permits outbound SMTP.'
      });
      return;
    }

    const mailerReady = await isRealMailerConfigured();
    res.status(201).json({
      message: mailerReady ? 'Invite sent' : 'Invite created, but no real mailer is configured. Email preview details are in the backend console.',
      mailMode: mailerReady ? 'real' : 'preview',
      user: { name: user.name, email: user.email, role: user.role, status: user.status }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const acceptInvite = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({ inviteToken: token, status: 'pending' });
    if (!user) {
      res.status(400).json({ message: 'Invalid or expired invite token' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user.password = hashedPassword;
    user.status = 'active';
    user.inviteToken = undefined;
    await user.save();

    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user.id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
