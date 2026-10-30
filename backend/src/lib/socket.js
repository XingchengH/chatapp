import { Server } from "socket.io";
import http from "node:http";
import { createHash } from "node:crypto";
import { parse } from "cookie";
import express from "express";
import { authenticateToken } from "./auth.js";
import { clientOrigin } from "./config.js";

export const userRoom = (userId) => "user:" + userId;
const sessionRoom = (token) =>
  "session:" + createHash("sha256").update(token).digest("hex");
export const app = express();
export const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: clientOrigin(),
    credentials: true,
  },
  allowRequest: (req, callback) => {
    const origin = req.headers.origin;
    callback(null, !origin || origin === clientOrigin());
  },
});
io.use(async (socket, next) => {
  try {
    const token = parse(socket.request.headers.cookie || "").jwt;
    const { user, expiresAt } = await authenticateToken(token);
    socket.data.userId = String(user._id);
    socket.data.expiresAt = expiresAt;
    socket.data.sessionRoom = sessionRoom(token);
    next();
  } catch {
    next(new Error("Authentication required"));
  }
});
// A user's other tabs stay online when one disconnects.
const connectedUsers = new Map();
io.on("connection", (socket) => {
  const { userId, expiresAt } = socket.data;
  socket.join(userRoom(userId));
  socket.join(socket.data.sessionRoom);
  connectedUsers.set(userId, (connectedUsers.get(userId) || 0) + 1);
  io.emit("getOnlineUsers", [...connectedUsers.keys()]);
  const expiryTimer = setTimeout(
    () => socket.disconnect(true),
    Math.max(0, expiresAt - Date.now()),
  );
  expiryTimer.unref();
  socket.on("disconnect", () => {
    clearTimeout(expiryTimer);
    const remaining = connectedUsers.get(userId) - 1;
    if (remaining > 0) connectedUsers.set(userId, remaining);
    else {
      connectedUsers.delete(userId);
      io.emit("getOnlineUsers", [...connectedUsers.keys()]);
    }
  });
});
export function disconnectSession(token) {
  if (typeof token === "string" && token)
    io.in(sessionRoom(token)).disconnectSockets(true);
}
