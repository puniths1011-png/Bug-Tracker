import express from 'express';
import { getProjects, createProject, getProjectById } from '../controllers/projectController';
import { protect, adminOnly } from '../middleware/authMiddleware';

const router = express.Router();

router.route('/')
  .get(protect, getProjects)
  // Only admins can create new projects; everyone can still see them.
  .post(protect, adminOnly, createProject);

router.route('/:id')
  .get(protect, getProjectById);

export default router;
