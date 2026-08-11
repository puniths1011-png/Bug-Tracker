import express from 'express';
import {
  getTickets, createTicket, getTicketById, updateTicket, updateTicketStatus,
  getTicketScreenshot, assignTicket, addTicketComment, updateFixNotes
} from '../controllers/ticketController';
import { protect, adminOnly } from '../middleware/authMiddleware';
import { optionalUpload } from '../middleware/uploadMiddleware';

const router = express.Router();

router.route('/')
  .get(protect, getTickets)
  .post(protect, optionalUpload, createTicket);

router.route('/:id')
  .get(protect, getTicketById)
  .put(protect, optionalUpload, updateTicket);

// No auth on the raw screenshot bytes -- it's rendered directly as <img src="..." )
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
