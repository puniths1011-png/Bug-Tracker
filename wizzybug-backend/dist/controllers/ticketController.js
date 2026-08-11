"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.addTicketComment = exports.updateFixNotes = exports.assignTicket = exports.updateTicketStatus = exports.getTicketById = exports.updateTicket = exports.getTicketScreenshot = exports.createTicket = exports.getTickets = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Ticket_1 = __importDefault(require("../models/Ticket"));
const User_1 = __importDefault(require("../models/User"));
const mailer_1 = require("../utils/mailer");
const cloudinary_1 = require("../config/cloudinary");
const normalizeAssigneeIds = (value) => {
    const ids = Array.isArray(value)
        ? value.filter((item) => typeof item === 'string' || typeof item === 'number').map(String)
        : typeof value === 'string' || typeof value === 'number'
            ? [String(value)]
            : [];
    return ids.map(id => new mongoose_1.default.Types.ObjectId(id));
};
const getTickets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const filter = {};
        if (req.query.project)
            filter.project = req.query.project;
        if (req.query.assignee) {
            filter.$or = [{ assignees: req.query.assignee }, { assignee: req.query.assignee }];
        }
        if (req.query.status)
            filter.status = req.query.status;
        const tickets = yield Ticket_1.default.find(filter)
            .populate('project', 'name key')
            .populate('creator', 'name email')
            .populate('assignees', 'name email')
            .populate('assignee', 'name email')
            .sort({ createdAt: -1 });
        res.json(tickets);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});
exports.getTickets = getTickets;
const createTicket = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { title, description, priority, project, assignee, assignees, screenshotBase64, screenshotMimeType, environment, moduleFeatureName, buildAppVersion, releaseVersion, reproductionRate, expectedResult, actualResult, typeOfApplication, browser, browserVersion } = req.body;
        // Mock project and user for frontend integration testing
        let projectId = project;
        let creatorId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!projectId || !creatorId) {
            const defaultUser = yield Promise.resolve().then(() => __importStar(require('../models/User'))).then(m => m.default.findOne());
            const defaultProject = yield Promise.resolve().then(() => __importStar(require('../models/Project'))).then(m => m.default.findOne());
            if (defaultUser)
                creatorId = creatorId || defaultUser._id;
            if (defaultProject)
                projectId = projectId || defaultProject._id;
        }
        const creatorDoc = req.user || (creatorId ? yield User_1.default.findById(creatorId) : null);
        const normalizedAssignees = normalizeAssigneeIds(assignees !== null && assignees !== void 0 ? assignees : assignee);
        let screenshot;
        let imageUrl;
        let imagePublicId;
        if (req.file) {
            const uploadResult = yield (0, cloudinary_1.uploadToCloudinary)(req.file.buffer, req.file.originalname);
            imageUrl = uploadResult.secure_url;
            imagePublicId = uploadResult.public_id;
        }
        else if (screenshotBase64 && screenshotMimeType) {
            screenshot = {
                data: Buffer.from(screenshotBase64, 'base64'),
                contentType: screenshotMimeType
            };
        }
        const ticket = yield Ticket_1.default.create({
            title,
            description,
            priority: priority ? priority.toLowerCase() : 'medium',
            project: projectId,
            assignees: normalizedAssignees,
            assignee: normalizedAssignees[0] || undefined,
            creator: creatorId,
            screenshot,
            imageUrl,
            imagePublicId,
            environment, moduleFeatureName, buildAppVersion, releaseVersion, reproductionRate,
            expectedResult, actualResult, typeOfApplication, browser, browserVersion,
            history: [{
                    type: 'created',
                    message: normalizedAssignees.length ? `Bug reported and assigned to ${normalizedAssignees.length} developer${normalizedAssignees.length > 1 ? 's' : ''}` : 'Bug reported',
                    actor: creatorId,
                    actorName: (creatorDoc === null || creatorDoc === void 0 ? void 0 : creatorDoc.name) || 'Unknown user',
                    createdAt: new Date()
                }]
        });
        // Notify each assignee by email if the reporter assigned it right away.
        if (normalizedAssignees.length) {
            const assigneeDocs = yield User_1.default.find({ _id: { $in: normalizedAssignees } });
            for (const assigneeDoc of assigneeDocs) {
                if (assigneeDoc === null || assigneeDoc === void 0 ? void 0 : assigneeDoc.email) {
                    (0, mailer_1.sendMail)({
                        to: assigneeDoc.email,
                        subject: `New bug assigned to you: ${title}`,
                        text: `Hi ${assigneeDoc.name},\n\nA new bug "${title}" has been assigned to you on WizzyTrack.\n\nPriority: ${ticket.priority}\n\nLog in to WizzyTrack to view the details.`,
                        html: `<p>Hi ${assigneeDoc.name},</p><p>A new bug <b>${title}</b> has been assigned to you on WizzyTrack.</p><p>Priority: <b>${ticket.priority}</b></p><p>Log in to WizzyTrack to view the full details.</p>`
                    }).catch(err => console.error('[createTicket] assignment email failed:', err));
                }
            }
        }
        res.status(201).json(ticket);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});
exports.createTicket = createTicket;
const getTicketScreenshot = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const ticket = yield Ticket_1.default.findById(req.params.id);
        if (!ticket || !ticket.screenshot || !ticket.screenshot.data) {
            res.status(404).send('Not found');
            return;
        }
        res.set('Content-Type', ticket.screenshot.contentType);
        res.send(ticket.screenshot.data);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});
exports.getTicketScreenshot = getTicketScreenshot;
const updateTicket = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const ticket = yield Ticket_1.default.findById(req.params.id);
        if (!ticket) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }
        const { title, description, priority, project, assignee, assignees, environment, moduleFeatureName, buildAppVersion, releaseVersion, reproductionRate, expectedResult, actualResult, typeOfApplication, browser, browserVersion } = req.body;
        const normalizedAssignees = normalizeAssigneeIds(assignees !== null && assignees !== void 0 ? assignees : assignee);
        if (req.file) {
            if (ticket.imagePublicId) {
                try {
                    yield (0, cloudinary_1.deleteFromCloudinary)(ticket.imagePublicId);
                }
                catch (err) {
                    console.error('[updateTicket] Cloudinary delete failed:', err);
                }
            }
            const uploadResult = yield (0, cloudinary_1.uploadToCloudinary)(req.file.buffer, req.file.originalname);
            ticket.imageUrl = uploadResult.secure_url;
            ticket.imagePublicId = uploadResult.public_id;
            ticket.screenshot = undefined;
        }
        if (title)
            ticket.title = title;
        if (description)
            ticket.description = description;
        if (priority)
            ticket.priority = priority.toLowerCase();
        if (project)
            ticket.project = project;
        ticket.assignees = normalizedAssignees;
        ticket.assignee = normalizedAssignees[0] || undefined;
        if (environment !== undefined)
            ticket.environment = environment;
        if (moduleFeatureName !== undefined)
            ticket.moduleFeatureName = moduleFeatureName;
        if (buildAppVersion !== undefined)
            ticket.buildAppVersion = buildAppVersion;
        if (releaseVersion !== undefined)
            ticket.releaseVersion = releaseVersion;
        if (reproductionRate !== undefined)
            ticket.reproductionRate = reproductionRate;
        if (expectedResult !== undefined)
            ticket.expectedResult = expectedResult;
        if (actualResult !== undefined)
            ticket.actualResult = actualResult;
        if (typeOfApplication !== undefined)
            ticket.typeOfApplication = typeOfApplication;
        if (browser !== undefined)
            ticket.browser = browser;
        if (browserVersion !== undefined)
            ticket.browserVersion = browserVersion;
        ticket.history.push({
            type: 'update',
            message: 'Ticket details updated',
            actor: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
            actorName: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'Unknown user',
            createdAt: new Date()
        });
        yield ticket.save();
        const populated = yield ticket.populate([
            { path: 'project', select: 'name key' },
            { path: 'creator', select: 'name email' },
            { path: 'assignees', select: 'name email' },
            { path: 'assignee', select: 'name email' }
        ]);
        res.json(populated);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});
exports.updateTicket = updateTicket;
const getTicketById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const ticket = yield Ticket_1.default.findById(req.params.id)
            .populate('project', 'name key')
            .populate('creator', 'name email')
            .populate('assignees', 'name email')
            .populate('assignee', 'name email');
        if (!ticket) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }
        res.json(ticket);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});
exports.getTicketById = getTicketById;
const updateTicketStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { status, note } = req.body;
        const ticket = yield Ticket_1.default.findById(req.params.id);
        if (!ticket) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }
        const previousStatus = ticket.status;
        ticket.status = status;
        ticket.history.push({
            type: 'status',
            message: `Status changed from "${previousStatus.replace('_', ' ')}" to "${String(status).replace('_', ' ')}"${note ? `: ${note}` : ''}`,
            actor: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
            actorName: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'System',
            createdAt: new Date()
        });
        yield ticket.save();
        const populated = yield ticket.populate([
            { path: 'project', select: 'name key' },
            { path: 'creator', select: 'name email' },
            { path: 'assignees', select: 'name email' },
            { path: 'assignee', select: 'name email' }
        ]);
        res.json(populated);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});
exports.updateTicketStatus = updateTicketStatus;
// Admin-only: assign (or reassign) a ticket to a developer, notifying them by email.
const assignTicket = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { assignees, assignee } = req.body;
        const ticket = yield Ticket_1.default.findById(req.params.id);
        if (!ticket) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }
        const normalizedAssignees = normalizeAssigneeIds(assignees !== null && assignees !== void 0 ? assignees : assignee);
        const assigneeDocs = normalizedAssignees.length
            ? yield User_1.default.find({ _id: { $in: normalizedAssignees } })
            : [];
        if (normalizedAssignees.length && assigneeDocs.length !== normalizedAssignees.length) {
            res.status(400).json({ message: 'One or more assignee users were not found' });
            return;
        }
        ticket.assignees = normalizedAssignees;
        ticket.assignee = normalizedAssignees[0];
        if (ticket.status === 'open')
            ticket.status = 'in_progress';
        const assigneeNames = assigneeDocs.map(doc => doc.name).join(', ');
        ticket.history.push({
            type: 'assignment',
            message: assigneeNames ? `Assigned to ${assigneeNames}` : 'Assignment cleared',
            actor: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
            actorName: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'Admin',
            createdAt: new Date()
        });
        yield ticket.save();
        for (const assigneeDoc of assigneeDocs) {
            if (assigneeDoc.email) {
                (0, mailer_1.sendMail)({
                    to: assigneeDoc.email,
                    subject: `Bug assigned to you: ${ticket.title}`,
                    text: `Hi ${assigneeDoc.name},\n\n${((_c = req.user) === null || _c === void 0 ? void 0 : _c.name) || 'An admin'} assigned the bug "${ticket.title}" to you on WizzyTrack.\n\nPriority: ${ticket.priority}\n\nLog in to WizzyTrack to view the details and start working on it.`,
                    html: `<p>Hi ${assigneeDoc.name},</p><p><b>${((_d = req.user) === null || _d === void 0 ? void 0 : _d.name) || 'An admin'}</b> assigned the bug <b>${ticket.title}</b> to you on WizzyTrack.</p><p>Priority: <b>${ticket.priority}</b></p><p>Log in to WizzyTrack to view the details and start working on it.</p>`
                }).catch(err => console.error('[assignTicket] email failed:', err));
            }
        }
        const populated = yield ticket.populate([
            { path: 'project', select: 'name key' },
            { path: 'creator', select: 'name email' },
            { path: 'assignees', select: 'name email' },
            { path: 'assignee', select: 'name email' }
        ]);
        res.json(populated);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
});
exports.assignTicket = assignTicket;
// Save/update the "fix description" notes shown on the bug detail page.
const updateFixNotes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { fixDescription } = req.body;
        const ticket = yield Ticket_1.default.findById(req.params.id);
        if (!ticket) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }
        ticket.fixDescription = fixDescription;
        ticket.history.push({
            type: 'update',
            message: 'Updated the fix description',
            actor: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
            actorName: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'Unknown user',
            createdAt: new Date()
        });
        yield ticket.save();
        const populated = yield ticket.populate([
            { path: 'project', select: 'name key' },
            { path: 'creator', select: 'name email' },
            { path: 'assignees', select: 'name email' },
            { path: 'assignee', select: 'name email' }
        ]);
        res.json(populated);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});
exports.updateFixNotes = updateFixNotes;
// Add a timestamped comment/update note to a ticket (any authenticated user).
const addTicketComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { text } = req.body;
        if (!text || !text.trim()) {
            res.status(400).json({ message: 'Comment text is required' });
            return;
        }
        const ticket = yield Ticket_1.default.findById(req.params.id);
        if (!ticket) {
            res.status(404).json({ message: 'Ticket not found' });
            return;
        }
        ticket.comments.push({
            author: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
            authorName: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'Unknown user',
            text: text.trim(),
            createdAt: new Date()
        });
        yield ticket.save();
        const populated = yield ticket.populate([
            { path: 'project', select: 'name key' },
            { path: 'creator', select: 'name email' },
            { path: 'assignees', select: 'name email' },
            { path: 'assignee', select: 'name email' }
        ]);
        res.json(populated);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});
exports.addTicketComment = addTicketComment;
