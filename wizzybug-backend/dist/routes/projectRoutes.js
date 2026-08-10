"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const projectController_1 = require("../controllers/projectController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.route('/')
    .get(authMiddleware_1.protect, projectController_1.getProjects)
    // Only admins can create new projects; everyone can still see them.
    .post(authMiddleware_1.protect, authMiddleware_1.adminOnly, projectController_1.createProject);
router.route('/:id')
    .get(authMiddleware_1.protect, projectController_1.getProjectById);
exports.default = router;
