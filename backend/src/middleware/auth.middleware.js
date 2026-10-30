import { authenticateToken } from "../lib/auth.js";
import { respondWithError } from "../lib/errors.js";
export const protectedRoute = async (req, res, next) => {
  try {
    const { user } = await authenticateToken(req.cookies?.jwt);
    req.user = user;
    next();
  } catch (error) {
    respondWithError(res, error);
  }
};
