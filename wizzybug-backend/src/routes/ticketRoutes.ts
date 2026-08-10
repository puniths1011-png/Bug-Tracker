import express from 'express';
import {
  getTickets, createTicket, getTicketById, updateTicketStatus,
  getTicketScreenshot, assignTicket, addTicketComment, updateFixNotes
} from '../controllers/ticketController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
  .get(protect, getTickets)
  .post(protect, createTicket);

router.route('/:id')
  .get(protect, getTicketById);

// No auth on the raw screenshot bytes -- it's rendered directly as <img src="...">
// and doesn't carry an Authorization header, same as any static image URL.
router.route('/:id/screenshot')
  .get(getTicketScreenshot);

router.route('/:id/status')
  .put(protect, updateTicketStatus);

// Admin-only: assign/reassign a bug to a developer.
router.route('/:id/assign')
  .put(protect, adminOnly, assignTicket);

router.route('/:id/comments')
  .post(protect, addTicketComment);

router.route('/:id/fix-notes')
  .put(protect, updateFixNotes);

export default router;
