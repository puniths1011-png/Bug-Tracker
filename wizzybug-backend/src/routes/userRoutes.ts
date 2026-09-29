import express from "express";
import { getUsers, updateCurrentUser } from "../controllers/userController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.patch("/me", protect, updateCurrentUser);
router.route("/").get(protect, getUsers);

export default router;
