import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import { HttpError } from "./errors.js";

export function publicUser(user) {
  return {
    _id: user._id,
    email: user.email,
    fullName: user.fullName,
    profilePic: user.profilePic,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
export async function authenticateToken(token) {
  if (!token || typeof token !== "string")
    throw new HttpError(401, "Authentication required");
  let claims;
  try {
    claims = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    if (
      typeof claims.id !== "string" ||
      !/^[a-f\d]{24}$/i.test(claims.id) ||
      !Number.isFinite(claims.exp)
    )
      throw new Error();
  } catch {
    throw new HttpError(
      401,
      "Session expired or invalid. Please sign in again.",
    );
  }
  const user = await User.findById(claims.id).select(
    "_id email fullName profilePic createdAt updatedAt",
  );
  if (!user) throw new HttpError(401, "Authentication required");
  return { user, expiresAt: claims.exp * 1000 };
}
