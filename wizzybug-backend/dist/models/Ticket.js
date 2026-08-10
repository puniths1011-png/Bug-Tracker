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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const HistorySchema = new mongoose_1.Schema({
    type: { type: String, enum: ['created', 'status', 'assignment', 'priority', 'update'], required: true },
    message: { type: String, required: true },
    actor: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    actorName: { type: String },
    createdAt: { type: Date, default: Date.now }
}, { _id: false });
const CommentSchema = new mongoose_1.Schema({
    author: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    authorName: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
}, { _id: false });
const TicketSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true },
    creator: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    assignees: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'User' }],
    assignee: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
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
exports.default = mongoose_1.default.model('Ticket', TicketSchema);
