"use strict";
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
exports.getProjectById = exports.createProject = exports.getProjects = void 0;
const Project_1 = __importDefault(require("../models/Project"));
const Ticket_1 = __importDefault(require("../models/Ticket"));
const makeKey = (name) => {
    const letters = name.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(Boolean);
    if (letters.length === 1)
        return letters[0].slice(0, 4).toUpperCase();
    return letters.map(w => w[0]).join('').slice(0, 4).toUpperCase();
};
const getProjects = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const projects = yield Project_1.default.find().populate('members', 'name email').sort({ createdAt: -1 });
        // Attach a live open-bug count per project so the sidebar can show it without
        // an extra round trip per project.
        const counts = yield Ticket_1.default.aggregate([
            { $match: { status: { $ne: 'closed' } } },
            { $group: { _id: '$project', count: { $sum: 1 } } }
        ]);
        const countMap = {};
        counts.forEach(c => { countMap[String(c._id)] = c.count; });
        const withCounts = projects.map(p => (Object.assign(Object.assign({}, p.toObject()), { openBugCount: countMap[String(p._id)] || 0 })));
        res.json(withCounts);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});
exports.getProjects = getProjects;
const createProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, description, members, key } = req.body;
        if (!name || !name.trim()) {
            res.status(400).json({ message: 'Project name is required' });
            return;
        }
        const existing = yield Project_1.default.findOne({ name: name.trim() });
        if (existing) {
            res.status(400).json({ message: 'A project with this name already exists' });
            return;
        }
        // Default members to creator if not provided
        const projectMembers = members || (req.user ? [req.user._id] : []);
        const project = yield Project_1.default.create({
            name: name.trim(),
            key: (key && key.trim()) ? key.trim().toUpperCase() : makeKey(name.trim()),
            description,
            members: projectMembers,
            createdBy: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id
        });
        res.status(201).json(project);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});
exports.createProject = createProject;
const getProjectById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const project = yield Project_1.default.findById(req.params.id).populate('members', 'name email');
        if (!project) {
            res.status(404).json({ message: 'Project not found' });
            return;
        }
        res.json(project);
    }
    catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});
exports.getProjectById = getProjectById;
