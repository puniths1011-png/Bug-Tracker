"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ticketController_1 = require("../controllers/ticketController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const uploadMiddleware_1 = require("../middleware/uploadMiddleware");
const router = express_1.default.Router();
router.route('/')
    .get(authMiddleware_1.protect, ticketController_1.getTickets)
    .post(authMiddleware_1.protect, uploadMiddleware_1.optionalUpload, ticketController_1.createTicket);
router.route('/:id')
    .get(authMiddleware_1.protect, ticketController_1.getTicketById)
    .put(authMiddleware_1.protect, uploadMiddleware_1.optionalUpload, ticketController_1.updateTicket);
// No auth on the raw screenshot bytes -- it's rendered directly as <img src="..." )
// and doesn't carry an Authorization header, same as any static image URL.
router.route('/:id/screenshot')
    .get(ticketController_1.getTicketScreenshot);
router.route('/:id/status')
    .put(authMiddleware_1.protect, ticketController_1.updateTicketStatus);
// Admin-only: assign/reassign a bug to a developer.
router.route('/:id/assign')
    .put(authMiddleware_1.protect, authMiddleware_1.adminOnly, ticketController_1.assignTicket);
router.route('/:id/comments')
    .post(authMiddleware_1.protect, ticketController_1.addTicketComment);
router.route('/:id/fix-notes')
    .put(authMiddleware_1.protect, ticketController_1.updateFixNotes);
exports.default = router;
