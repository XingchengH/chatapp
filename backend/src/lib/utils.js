import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
export const cookieOptions = () => ({
  httpOnly: true,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
  path: "/",
});
export const generateToken = (userId, res) => {
  const token = jwt.sign({ id: String(userId) }, process.env.JWT_SECRET, {
    expiresIn: "1d",
    algorithm: "HS256",
    jwtid: randomUUID(),
  });
  res.cookie("jwt", token, { ...cookieOptions(), maxAge: 24 * 60 * 60 * 1000 });
};
