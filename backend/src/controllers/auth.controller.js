import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import User from "../models/user.model.js";
import { uploadImage } from "../lib/cloudinary.js";
import { generateToken, cookieOptions } from "../lib/utils.js";
import { publicUser } from "../lib/auth.js";
import { disconnectSession } from "../lib/socket.js";
import { HttpError, respondWithError } from "../lib/errors.js";
import {
  validateEmail,
  validatePassword,
  validateFullName,
  validateImage,
  escapeRegex,
} from "../lib/validation.js";

// Exact lookup uses the email index. Fallback preserves access for legacy mixed-case addresses.
async function findByEmail(email, includePassword = false) {
  const select = includePassword ? "+password" : "-password";
  const exact = await User.findOne({ email }).select(select);
  if (exact) return exact;
  return User.findOne({
    email: { $regex: "^\\s*" + escapeRegex(email) + "\\s*$", $options: "i" },
  }).select(select);
}
export const signup = async (req, res) => {
  try {
    const email = validateEmail(req.body?.email);
    const fullName = validateFullName(req.body?.fullName);
    const password = validatePassword(req.body?.password);
    if (await findByEmail(email))
      throw new HttpError(409, "An account with that email already exists");
    const user = await User.create({
      email,
      fullName,
      password: await bcrypt.hash(password, 10),
    });
    generateToken(user._id, res);
    res.status(201).json(publicUser(user));
  } catch (error) {
    respondWithError(res, error);
  }
};
export const login = async (req, res) => {
  try {
    const email = validateEmail(req.body?.email);
    const password = validatePassword(req.body?.password, 1);
    const user = await findByEmail(email, true);
    if (!user?.password || !(await bcrypt.compare(password, user.password)))
      throw new HttpError(
        401,
        "Invalid credentials. Google accounts should sign in with Google.",
      );
    generateToken(user._id, res);
    res.status(200).json(publicUser(user));
  } catch (error) {
    respondWithError(res, error);
  }
};
const client = new OAuth2Client();
export const googleAuth = async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID)
      throw new HttpError(503, "Google sign-in is not configured");
    const token = req.body?.token;
    if (typeof token !== "string" || !token || token.length > 10000)
      throw new HttpError(400, "A Google credential is required");
    let payload;
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      throw new HttpError(401, "Invalid Google credential");
    }
    if (!payload?.email_verified || !payload.sub)
      throw new HttpError(401, "A verified Google email is required");
    const email = validateEmail(payload.email);
    let user = await User.findOne({ googleId: payload.sub });
    if (!user) {
      user = await findByEmail(email);
      if (user) {
        // Do not silently link a third-party-email Google identity to an existing account.
        if (user.googleId || !(email.endsWith("@gmail.com") || payload.hd))
          throw new HttpError(
            409,
            "Use your original sign-in method for this account",
          );
        user.googleId = payload.sub;
        await user.save();
      } else {
        user = await User.create({
          email,
          fullName: validateFullName(payload.name || email.split("@")[0]),
          googleId: payload.sub,
          profilePic: payload.picture || "",
        });
      }
    }
    generateToken(user._id, res);
    res.status(200).json(publicUser(user));
  } catch (error) {
    respondWithError(res, error);
  }
};
export const logout = async (req, res) => {
  disconnectSession(req.cookies?.jwt);
  res.clearCookie("jwt", cookieOptions());
  res.status(200).json({ message: "Logout successful" });
};
export const updateProfile = async (req, res) => {
  try {
    const profilePic = validateImage(req.body?.profilePic);
    const upload = await uploadImage(profilePic);
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profilePic: upload.secure_url },
      { new: true, runValidators: true },
    );
    if (!user) throw new HttpError(404, "User not found");
    res.status(200).json(publicUser(user));
  } catch (error) {
    respondWithError(res, error);
  }
};
export const checkAuth = (req, res) =>
  res.status(200).json(publicUser(req.user));
