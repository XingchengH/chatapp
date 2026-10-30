import { Router } from "express";
import {
  login,
  googleAuth,
  logout,
  signup,
  updateProfile,
  checkAuth,
} from "../controllers/auth.controller.js";
import { protectedRoute } from "../middleware/auth.middleware.js";
import { authLimiter, profileLimiter } from "../middleware/rate-limit.js";

const router = Router();

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.post("/google", authLimiter, googleAuth);

router.put("/update-profile", protectedRoute, profileLimiter, updateProfile);

router.get("/check", protectedRoute, checkAuth);

export default router;
