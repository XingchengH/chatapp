import { rateLimit } from "express-rate-limit";
const options = {
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { message: "Too many requests. Please try again later." },
};
export const authLimiter = rateLimit({
  ...options,
  windowMs: 15 * 60 * 1000,
  limit: 30,
});
export const messageLimiter = rateLimit({
  ...options,
  windowMs: 60 * 1000,
  limit: 60,
  keyGenerator: (req) => String(req.user._id),
});
export const profileLimiter = rateLimit({
  ...options,
  windowMs: 60 * 1000,
  limit: 10,
  keyGenerator: (req) => String(req.user._id),
});
