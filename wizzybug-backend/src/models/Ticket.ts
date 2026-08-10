import mongoose, { Schema, Document } from 'mongoose';

export interface ITicketHistoryEntry {
  type: 'created' | 'status' | 'assignment' | 'priority' | 'update';
  message: string;
  actor?: mongoose.Types.ObjectId;
  actorName?: string;
  createdAt: Date;
}

export interface ITicketComment {
  author: mongoose.Types.ObjectId;
  authorName: string;
  text: string;
  createdAt: Date;
}

export interface ITicket extends Document {
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'rejected' | 'deferred' | 'not_reproducible';
  priority: 'low' | 'medium' | 'high' | 'critical';
  project: mongoose.Types.ObjectId;
  creator: mongoose.Types.ObjectId;
  assignees?: mongoose.Types.ObjectId[];
  assignee?: mongoose.Types.ObjectId;
  screenshot?: { data: Buffer, contentType: String };
  fixDescription?: string;
  environment?: string;
  moduleFeatureName?: string;
  buildAppVersion?: string;
  releaseVersion?: string;
  reproductionRate?: string;
  expectedResult?: string;
  actualResult?: string;
  typeOfApplication?: string;
  browser?: string;
  browserVersion?: string;
  history: ITicketHistoryEntry[];
  comments: ITicketComment[];
}

const HistorySchema = new Schema<ITicketHistoryEntry>({
  type: { type: String, enum: ['created', 'status', 'assignment', 'priority', 'update'], required: true },
  message: { type: String, required: true },
  actor: { type: Schema.Types.ObjectId, ref: 'User' },
  actorName: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const CommentSchema = new Schema<ITicketComment>({
  author: { type: Schema.Types.ObjectId, ref: 'User' },
  authorName: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const TicketSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed', 'rejected', 'deferred', 'not_reproducible'], default: 'open' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  assignees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  assignee: { type: Schema.Types.ObjectId, ref: 'User' },
  screenshot: { data: Buffer, contentType: String },
  fixDescription: { type: String },
  environment: { type: String },
  moduleFeatureName: { type: String },
  buildAppVersion: { type: String },
  releaseVersion: { type: String },
  reproductionRate: { type: String },
  expectedResult: { type: String },
  actualResult: { type: String },
  typeOfApplication: { type: String },
  browser: { type: String },
  browserVersion: { type: String },
  history: { type: [HistorySchema], default: [] },
  comments: { type: [CommentSchema], default: [] }
}, { timestamps: true });

export default mongoose.model<ITicket>('Ticket', TicketSchema);
