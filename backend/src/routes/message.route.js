import { Router } from "express";
import { protectedRoute } from "../middleware/auth.middleware.js";
import { messageLimiter } from "../middleware/rate-limit.js";
import { audioUpload } from "../middleware/audio-upload.js";
import {
  getUsersForSidebar,
  getMessages,
  sendMessage,
} from "../controllers/message.controller.js";

const router = Router();

router.get("/users", protectedRoute, getUsersForSidebar);
router.get("/:id", protectedRoute, getMessages);

router.post("/send/:id", protectedRoute, messageLimiter, sendMessage);
router.post("/audio/:id", protectedRoute, messageLimiter, audioUpload, sendMessage);

export default router;
