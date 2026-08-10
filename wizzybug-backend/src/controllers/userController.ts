import { Request, Response } from 'express';
import User from '../models/User';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const filter: Record<string, any> = {};

    // By default, hide invites that haven't been accepted yet (e.g. for an
    // "assign to developer" dropdown). Pass ?includePending=true for the
    // admin's user management page, which should show invite status too.
    if (req.query.includePending !== 'true') {
      filter.status = { $ne: 'pending' };
    }
    if (req.query.role) {
      filter.role = req.query.role;
    }

    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
