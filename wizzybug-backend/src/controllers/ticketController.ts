import mongoose from 'mongoose';
import { Response } from 'express';
import Ticket from '../models/Ticket';
import User from '../models/User';
import { AuthRequest } from '../middleware/authMiddleware';
import { sendMail } from '../utils/mailer';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';

const normalizeAssigneeIds = (value: unknown): mongoose.Types.ObjectId[] => {
  const ids = Array.isArray(value)
    ? value.filter((item): item is string | number => typeof item === 'string' || typeof item === 'number').map(String)
    : typeof value === 'string' || typeof value === 'number'
      ? [String(value)]
      : [];

  return ids.map(id => new mongoose.Types.ObjectId(id));
};

export const getTickets = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const filter: Record<string, any> = {};
    if (req.query.project) filter.project = req.query.project;
    if (req.query.assignee) {
      filter.$or = [{ assignees: req.query.assignee }, { assignee: req.query.assignee }];
    }
    if (req.query.status) filter.status = req.query.status;

    const tickets = await Ticket.find(filter)
      .populate('project', 'name key')
      .populate('creator', 'name email')
      .populate('assignees', 'name email')
      .populate('assignee', 'name email')
      .sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const createTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      title, description, priority, project, assignee, assignees, screenshotBase64, screenshotMimeType,
      environment, moduleFeatureName, buildAppVersion, releaseVersion, reproductionRate,
      expectedResult, actualResult, typeOfApplication, browser, browserVersion
    } = req.body;

    const projectId = project;
    const creatorId = req.user?._id;

    if (!projectId) {
      res.status(400).json({ message: 'Project is required' });
      return;
    }

    if (!creatorId) {
      res.status(400).json({ message: 'Creator is required' });
      return;
    }

    const creatorDoc = req.user || (creatorId ? await User.findById(creatorId) : null);
    const normalizedAssignees = normalizeAssigneeIds(assignees ?? assignee);

    let screenshot;
    let imageUrl;
    let imagePublicId;

    if (req.file) {
      const uploadResult = await uploadToCloudinary(req.file.buffer, req.file.originalname);
      imageUrl = uploadResult.secure_url;
      imagePublicId = uploadResult.public_id;
    } else if (screenshotBase64 && screenshotMimeType) {
      screenshot = {
        data: Buffer.from(screenshotBase64, 'base64'),
        contentType: screenshotMimeType
      };
    }

    const ticket = await Ticket.create({
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
        message: normalizedAssignees.length ? `Bug reported and assigned to ${normalizedAssignees.length} team member${normalizedAssignees.length > 1 ? 's' : ''}` : 'Bug reported',
        actor: creatorId,
        actorName: creatorDoc?.name || 'Unknown user',
        createdAt: new Date()
      }]
    });

    // Notify each assignee by email if the reporter assigned it right away.
    if (normalizedAssignees.length) {
      const assigneeDocs = await User.find({ _id: { $in: normalizedAssignees } });
      for (const assigneeDoc of assigneeDocs) {
        if (assigneeDoc?.email) {
          sendMail({
            to: assigneeDoc.email,
            subject: `New bug assigned to you: ${title}`,
            text: `Hi ${assigneeDoc.name},\n\nA new bug "${title}" has been assigned to you on WizzyBug.\n\nPriority: ${ticket.priority}\n\nLog in to WizzyBug to view the details.`,
            html: `<p>Hi ${assigneeDoc.name},</p><p>A new bug <b>${title}</b> has been assigned to you on WizzyBug.</p><p>Priority: <b>${ticket.priority}</b></p><p>Log in to WizzyBug to view the full details.</p>`
          }).catch(err => console.error('[createTicket] assignment email failed:', err));
        }
      }
    }

    res.status(201).json(ticket);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getTicketScreenshot = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket || !ticket.screenshot || !ticket.screenshot.data) {
      res.status(404).send('Not found');
      return;
    }
    res.set('Content-Type', ticket.screenshot.contentType as string);
    res.send(ticket.screenshot.data);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const updateTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found' });
      return;
    }

    const {
      title, description, priority, project, assignee, assignees,
      environment, moduleFeatureName, buildAppVersion, releaseVersion,
      reproductionRate, expectedResult, actualResult, typeOfApplication,
      browser, browserVersion
    } = req.body;

    const hasAssigneeUpdate = assignees !== undefined || assignee !== undefined;
    const normalizedAssignees = hasAssigneeUpdate
      ? normalizeAssigneeIds(assignees ?? assignee)
      : null;

    if (req.file) {
      if (ticket.imagePublicId) {
        try {
          await deleteFromCloudinary(ticket.imagePublicId);
        } catch (err) {
          console.error('[updateTicket] Cloudinary delete failed:', err);
        }
      }

      const uploadResult = await uploadToCloudinary(req.file.buffer, req.file.originalname);
      ticket.imageUrl = uploadResult.secure_url;
      ticket.imagePublicId = uploadResult.public_id;
      ticket.screenshot = undefined;
    }

    if (title) ticket.title = title;
    if (description) ticket.description = description;
    if (priority) ticket.priority = priority.toLowerCase();
    if (project) ticket.project = project;
    if (normalizedAssignees) {
      if (normalizedAssignees) {
        ticket.assignees = normalizedAssignees;
        ticket.assignee = normalizedAssignees[0] || undefined;
      }
    }
    if (environment !== undefined) ticket.environment = environment;
    if (moduleFeatureName !== undefined) ticket.moduleFeatureName = moduleFeatureName;
    if (buildAppVersion !== undefined) ticket.buildAppVersion = buildAppVersion;
    if (releaseVersion !== undefined) ticket.releaseVersion = releaseVersion;
    if (reproductionRate !== undefined) ticket.reproductionRate = reproductionRate;
    if (expectedResult !== undefined) ticket.expectedResult = expectedResult;
    if (actualResult !== undefined) ticket.actualResult = actualResult;
    if (typeOfApplication !== undefined) ticket.typeOfApplication = typeOfApplication;
    if (browser !== undefined) ticket.browser = browser;
    if (browserVersion !== undefined) ticket.browserVersion = browserVersion;

    ticket.history.push({
      type: 'update',
      message: 'Ticket details updated',
      actor: req.user?._id,
      actorName: req.user?.name || 'Unknown user',
      createdAt: new Date()
    });

    await ticket.save();

    const populated = await ticket.populate([
      { path: 'project', select: 'name key' },
      { path: 'creator', select: 'name email' },
      { path: 'assignees', select: 'name email' },
      { path: 'assignee', select: 'name email' }
    ]);

    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getTicketById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('project', 'name key')
      .populate('creator', 'name email')
      .populate('assignees', 'name email')
      .populate('assignee', 'name email');

    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found' });
      return;
    }
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export const updateTicketStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, note } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found' });
      return;
    }

    const previousStatus = ticket.status;
    ticket.status = status;
    ticket.history.push({
      type: 'status',
      message: `Status changed from "${previousStatus.replace('_', ' ')}" to "${String(status).replace('_', ' ')}"${note ? `: ${note}` : ''}`,
      actor: req.user?._id,
      actorName: req.user?.name || 'System',
      createdAt: new Date()
    });
    await ticket.save();

    const populated = await ticket.populate([
      { path: 'project', select: 'name key' },
      { path: 'creator', select: 'name email' },
      { path: 'assignees', select: 'name email' },
      { path: 'assignee', select: 'name email' }
    ]);

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Admin-only: assign (or reassign) a ticket to a team member, notifying them by email.
export const assignTicket = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { assignees, assignee } = req.body;
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found' });
      return;
    }

    const normalizedAssignees = normalizeAssigneeIds(assignees ?? assignee);
    const assigneeDocs = normalizedAssignees.length
      ? await User.find({ _id: { $in: normalizedAssignees } })
      : [];

    if (normalizedAssignees.length && assigneeDocs.length !== normalizedAssignees.length) {
      res.status(400).json({ message: 'One or more assignee users were not found' });
      return;
    }

    ticket.assignees = normalizedAssignees as any;
    ticket.assignee = normalizedAssignees[0] as any;
    if (ticket.status === 'open') ticket.status = 'in_progress';
    const assigneeNames = assigneeDocs.map(doc => doc.name).join(', ');
    ticket.history.push({
      type: 'assignment',
      message: assigneeNames ? `Assigned to ${assigneeNames}` : 'Assignment cleared',
      actor: req.user?._id,
      actorName: req.user?.name || 'Admin',
      createdAt: new Date()
    });
    await ticket.save();

    for (const assigneeDoc of assigneeDocs) {
      if (assigneeDoc.email) {
        sendMail({
          to: assigneeDoc.email,
          subject: `Bug assigned to you: ${ticket.title}`,
          text: `Hi ${assigneeDoc.name},\n\n${req.user?.name || 'An admin'} assigned the bug "${ticket.title}" to you on WizzyBug.\n\nPriority: ${ticket.priority}\n\nLog in to WizzyBug to view the details and start working on it.`,
          html: `<p>Hi ${assigneeDoc.name},</p><p><b>${req.user?.name || 'An admin'}</b> assigned the bug <b>${ticket.title}</b> to you on WizzyBug.</p><p>Priority: <b>${ticket.priority}</b></p><p>Log in to WizzyBug to view the details and start working on it.</p>`
        }).catch(err => console.error('[assignTicket] email failed:', err));
      }
    }

    const populated = await ticket.populate([
      { path: 'project', select: 'name key' },
      { path: 'creator', select: 'name email' },
      { path: 'assignees', select: 'name email' },
      { path: 'assignee', select: 'name email' }
    ]);

    res.json(populated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// Save/update the "fix description" notes shown on the bug detail page.
export const updateFixNotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { fixDescription } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found' });
      return;
    }

    ticket.fixDescription = fixDescription;
    ticket.history.push({
      type: 'update',
      message: 'Updated the fix description',
      actor: req.user?._id,
      actorName: req.user?.name || 'Unknown user',
      createdAt: new Date()
    });
    await ticket.save();

    const populated = await ticket.populate([
      { path: 'project', select: 'name key' },
      { path: 'creator', select: 'name email' },
      { path: 'assignees', select: 'name email' },
      { path: 'assignee', select: 'name email' }
    ]);

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// Add a timestamped comment/update note to a ticket (any authenticated user).
export const addTicketComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      res.status(400).json({ message: 'Comment text is required' });
      return;
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      res.status(404).json({ message: 'Ticket not found' });
      return;
    }

    ticket.comments.push({
      author: req.user?._id as any,
      authorName: req.user?.name || 'Unknown user',
      text: text.trim(),
      createdAt: new Date()
    });
    await ticket.save();

    const populated = await ticket.populate([
      { path: 'project', select: 'name key' },
      { path: 'creator', select: 'name email' },
      { path: 'assignees', select: 'name email' },
      { path: 'assignee', select: 'name email' }
    ]);

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};
