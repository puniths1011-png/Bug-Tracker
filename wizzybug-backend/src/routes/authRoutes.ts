import express from 'express';
import { registerUser, loginUser, inviteUser, acceptInvite } from '../controllers/authController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
// Only admins can invite new teammates.
router.post('/invite', protect, adminOnly, inviteUser);
router.post('/accept-invite', acceptInvite);

export default router;
